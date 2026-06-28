package com.codeevo.github.service;

import com.codeevo.github.entity.ProjectGitHubLink;
import com.codeevo.github.repository.ProjectGitHubLinkRepository;
import com.codeevo.project.service.ProjectCodeService;
import com.codeevo.project.dto.response.ProjectCodeFileDto;
import com.codeevo.project.entity.Project;
import com.codeevo.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.codeevo.github.entity.ProjectGitHubLink.FileEntry;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;



@Service
@RequiredArgsConstructor
public class GitHubPushService {

    private final GitHubApiClient apiClient;
    private final ProjectGitHubLinkRepository linkRepository;
    private final ProjectCodeService codeService;
    private final ProjectRepository projectRepository;

    private final ConcurrentHashMap<String, ReentrantLock> projectLocks = new ConcurrentHashMap<>();

    public Map<String, Object> pushCode(String userId, String projectId, String branch,
                                         String message, boolean createPr, String prTitle) {
        ReentrantLock lock = projectLocks.computeIfAbsent(projectId, k -> new ReentrantLock());
        lock.lock();
        try {
            return pushCodeLocked(userId, projectId, branch, message, createPr, prTitle);
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> getPushStatus(String userId, String projectId) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));
        return Map.of(
                "lastPushedCommitSha", link.getLastPushedCommitSha(),
                "lastPushedAt", link.getLastPushedAt(),
                "pushedFiles", link.getLastPushedFiles() != null ? link.getLastPushedFiles().size() : 0
        );
    }

    public Map<String, Object> getSyncDiff(String userId, String projectId) {
        Optional<ProjectGitHubLink> opt = linkRepository.findByProjectId(projectId);
        if (opt.isEmpty()) {
            return Map.of("changes", List.of(), "totalChanges", 0,
                    "ahead", false, "behind", false,
                    "aheadBy", 0, "behindBy", 0, "lastPushedCommitSha", null,
                    "linked", false);
        }
        ProjectGitHubLink link = opt.get();

        String targetBranch = link.getActiveBranch();
        String fullName = link.getFullName();

        List<ProjectCodeFileDto> localFiles = new ArrayList<>(codeService.getFiles(projectId, userId, "", ""));
        projectRepository.findById(projectId).ifPresent(project -> {
            String diagram = project.getDiagramJson();
            if (diagram != null && !diagram.isBlank()) {
                localFiles.add(ProjectCodeFileDto.builder()
                        .filePath("diagram/graph.json")
                        .content(diagram)
                        .language("json")
                        .build());
            }
        });

        Map<String, ProjectCodeFileDto> localByPath = localFiles.stream()
                .collect(Collectors.toMap(
                        f -> f.getFilePath() != null ? f.getFilePath() : "unknown",
                        f -> f,
                        (a, b) -> a
                ));

        Map<String, String> remoteShas = new LinkedHashMap<>();
        for (String path : localByPath.keySet()) {
            try {
                ResponseEntity<Map> existing = apiClient.get(userId,
                        "/repos/" + fullName + "/contents/" + path + "?ref=" + targetBranch,
                        Map.class);
                if (existing.getBody() != null && existing.getBody().get("sha") instanceof String s) {
                    remoteShas.put(path, s);
                }
            } catch (Exception e) {
                // File doesn't exist on GitHub yet
            }
        }

        List<Map<String, Object>> changes = new ArrayList<>();

        for (Map.Entry<String, ProjectCodeFileDto> entry : localByPath.entrySet()) {
            String path = entry.getKey();
            ProjectCodeFileDto file = entry.getValue();
            String localSha = gitBlobSha(file.getContent() != null ? file.getContent() : "");
            String remoteSha = remoteShas.get(path);

            if (remoteSha == null) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("filePath", path);
                change.put("type", "added");
                change.put("content", file.getContent());
                changes.add(change);
            } else if (!localSha.equals(remoteSha)) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("filePath", path);
                change.put("type", "modified");
                change.put("content", file.getContent());
                changes.add(change);
            }
        }

        Map<String, String> lastPushed = entriesToMap(link.getLastPushedFiles());
        for (Map.Entry<String, String> entry : lastPushed.entrySet()) {
            if (!localByPath.containsKey(entry.getKey())) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("filePath", entry.getKey());
                change.put("type", "deleted");
                change.put("content", null);
                changes.add(change);
            }
        }

        String lastCommit = link.getLastPushedCommitSha();
        boolean ahead = false;
        boolean behind = false;
        int aheadBy = 0;
        int behindBy = 0;
        if (lastCommit != null) {
            try {
                ResponseEntity<Map> compare = apiClient.get(userId,
                        "/repos/" + fullName + "/compare/" + lastCommit + "..." + targetBranch,
                        Map.class);
                if (compare.getBody() != null) {
                    aheadBy = (int) compare.getBody().getOrDefault("ahead_by", 0);
                    behindBy = (int) compare.getBody().getOrDefault("behind_by", 0);
                    ahead = aheadBy > 0;
                    behind = behindBy > 0;
                }
            } catch (Exception e) {
                // Comparison failed — non-blocking
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("changes", changes);
        result.put("totalChanges", changes.size());
        result.put("ahead", ahead);
        result.put("behind", behind);
        result.put("aheadBy", aheadBy);
        result.put("behindBy", behindBy);
        result.put("lastPushedCommitSha", lastCommit);
        result.put("linked", true);
        return result;
    }

    private Map<String, Object> pushCodeLocked(String userId, String projectId, String branch,
                                                String message, boolean createPr, String prTitle) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));

        String targetBranch = branch != null ? branch : link.getActiveBranch();
        String fullName = link.getFullName();

        List<ProjectCodeFileDto> files = new ArrayList<>(codeService.getFiles(projectId, userId, "", ""));
        projectRepository.findById(projectId).ifPresent(project -> {
            String diagram = project.getDiagramJson();
            if (diagram != null && !diagram.isBlank()) {
                files.add(ProjectCodeFileDto.builder()
                        .filePath("diagram/graph.json")
                        .content(diagram)
                        .language("json")
                        .build());
            }
        });

        Map<String, ProjectCodeFileDto> localByPath = files.stream()
                .collect(Collectors.toMap(
                        f -> f.getFilePath() != null ? f.getFilePath() : "unknown",
                        f -> f,
                        (a, b) -> a
                ));

        Map<String, String> lastPushed = entriesToMap(link.getLastPushedFiles());
        Map<String, String> remoteShas = new LinkedHashMap<>();
        Map<String, String> localBlobShas = new LinkedHashMap<>();

        // Fetch live GitHub SHAs for all local files
        for (String path : localByPath.keySet()) {
            try {
                ResponseEntity<Map> existing = apiClient.get(userId,
                        "/repos/" + fullName + "/contents/" + path + "?ref=" + targetBranch,
                        Map.class);
                if (existing.getBody() != null && existing.getBody().get("sha") instanceof String s) {
                    remoteShas.put(path, s);
                }
            } catch (Exception e) {
                // File doesn't exist on GitHub yet — will be created
            }
            String content = localByPath.get(path).getContent();
            localBlobShas.put(path, gitBlobSha(content != null ? content : ""));
        }

        // Phase 1: identify what actually changed against live GitHub state
        List<String> toPut = new ArrayList<>();
        List<String> toDelete = new ArrayList<>();

        for (String path : localByPath.keySet()) {
            String remoteSha = remoteShas.get(path);
            String localSha = localBlobShas.get(path);

            if (remoteSha == null) {
                // File doesn't exist on GitHub at all
                toPut.add(path);
            } else if (!remoteSha.equals(localSha)) {
                // Content differs from GitHub's current state
                toPut.add(path);
            }
            // else: content matches GitHub exactly — skip
        }

        for (Map.Entry<String, String> entry : lastPushed.entrySet()) {
            if (!localByPath.containsKey(entry.getKey())) {
                // Was pushed before but no longer in local project
                toDelete.add(entry.getKey());
            }
        }

        // Phase 2: execute changes
        List<Map<String, Object>> results = new ArrayList<>();
        Map<String, String> newPushedFiles = new LinkedHashMap<>(remoteShas);

        for (String filePath : toDelete) {
            try {
                ResponseEntity<Map> existing = apiClient.get(userId,
                        "/repos/" + fullName + "/contents/" + filePath + "?ref=" + targetBranch,
                        Map.class);
                if (existing.getBody() != null && existing.getBody().get("sha") != null) {
                    Map<String, Object> deleteBody = new LinkedHashMap<>();
                    deleteBody.put("message", message);
                    deleteBody.put("sha", existing.getBody().get("sha"));
                    deleteBody.put("branch", targetBranch);
                    apiClient.put(userId,
                            "/repos/" + fullName + "/contents/" + filePath,
                            deleteBody, Map.class);
                }
                results.add(Map.of("file", filePath, "status", "deleted"));
                newPushedFiles.remove(filePath);
            } catch (Exception e) {
                results.add(Map.of("file", filePath, "status", "failed",
                        "error", e.getMessage() != null ? e.getMessage() : e.toString()));
            }
        }

        for (String filePath : toPut) {
            ProjectCodeFileDto file = localByPath.get(filePath);
            String fileContent = file.getContent() != null ? file.getContent() : "";
            try {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("message", message);
                body.put("content", Base64.getEncoder().encodeToString(fileContent.getBytes(StandardCharsets.UTF_8)));
                body.put("branch", targetBranch);

                String remoteSha = remoteShas.get(filePath);
                if (remoteSha != null) {
                    body.put("sha", remoteSha);
                }

                ResponseEntity<Map> response = apiClient.put(userId,
                        "/repos/" + fullName + "/contents/" + filePath,
                        body, Map.class);

                String commitSha = response.getBody() != null
                        ? (String) ((Map) response.getBody().get("commit")).get("sha")
                        : null;
                if (commitSha != null) {
                    newPushedFiles.put(filePath, localBlobShas.get(filePath));
                }

                results.add(Map.of("file", filePath, "status", "success", "commitSha", commitSha));
            } catch (Exception e) {
                results.add(Map.of("file", filePath, "status", "failed",
                        "error", e.getMessage() != null ? e.getMessage() : e.toString()));
            }
        }

        // Phase 3: update tracking
        String overallCommitSha = null;
        for (Map<String, Object> r : results) {
            if ("success".equals(r.get("status")) && r.get("commitSha") instanceof String s) {
                overallCommitSha = s;
            }
        }

        if (overallCommitSha != null) {
            link.setLastPushedCommitSha(overallCommitSha);
            link.setLastPushedAt(Instant.now());
            link.setLastPushedFiles(mapToEntries(newPushedFiles));
            linkRepository.save(link);
        }

        String prUrl = null;
        if (createPr && !results.isEmpty()) {
            String prBranch = "codeevo/" + Instant.now().toEpochMilli();
            try {
                ResponseEntity<Map> prResponse = apiClient.post(userId,
                        "/repos/" + fullName + "/pulls",
                        Map.of("title", prTitle.isEmpty() ? message : prTitle,
                                "head", prBranch, "base", link.getDefaultBranch(),
                                "body", "Auto-generated by CodeEvo IDE"),
                        Map.class);
                if (prResponse.getBody() != null) {
                    prUrl = (String) prResponse.getBody().get("html_url");
                }
            } catch (Exception e) {
                // PR creation failed — non-blocking
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", results.stream().noneMatch(r -> "failed".equals(r.get("status"))));
        response.put("filesProcessed", results.size());
        response.put("results", results);
        response.put("prUrl", prUrl);
        response.put("branch", targetBranch);
        response.put("commitSha", overallCommitSha);
        return response;
    }

    private Map<String, String> entriesToMap(List<FileEntry> entries) {
        if (entries == null) return Map.of();
        return entries.stream().collect(Collectors.toMap(FileEntry::getPath, FileEntry::getSha, (a, b) -> a));
    }

    private List<FileEntry> mapToEntries(Map<String, String> map) {
        return map.entrySet().stream()
                .map(e -> FileEntry.builder().path(e.getKey()).sha(e.getValue()).build())
                .collect(Collectors.toList());
    }

    private String gitBlobSha(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
            String header = "blob " + contentBytes.length + "\0";
            digest.update(header.getBytes(StandardCharsets.UTF_8));
            byte[] hash = digest.digest(contentBytes);
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            return content;
        }
    }
}
