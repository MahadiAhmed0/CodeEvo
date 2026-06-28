package com.codeevo.github.service;

import com.codeevo.github.entity.ProjectGitHubLink;
import com.codeevo.github.repository.ProjectGitHubLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubRepoService {

    private final GitHubApiClient apiClient;
    private final ProjectGitHubLinkRepository linkRepository;

    public List<Map<String, Object>> listRepositories(String userId, int page, int perPage) {
        if (!apiClient.hasToken(userId)) return List.of();
        ResponseEntity<Map[]> response = apiClient.get(userId,
                "/user/repos?page=" + page + "&per_page=" + perPage + "&sort=updated&type=owner",
                Map[].class);
        return Arrays.asList(Objects.requireNonNull(response.getBody()));
    }

    public List<Map<String, Object>> listBranches(String userId, String owner, String repo) {
        if (!apiClient.hasToken(userId)) return List.of();
        try {
            ResponseEntity<Map[]> response = apiClient.get(userId,
                    "/repos/" + owner + "/" + repo + "/branches",
                    Map[].class);
            return Arrays.asList(Objects.requireNonNull(response.getBody()));
        } catch (HttpClientErrorException e) {
            log.error("Failed to fetch branches for {}/{}: HTTP {} - {}", owner, repo, e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        }
    }

    public Map<String, Object> linkProject(String userId, String projectId, String repoOwner, String repoName, String branch) {
        String fullName = repoOwner + "/" + repoName;

        // If the repo is already linked to another project, unlink it first
        Optional<ProjectGitHubLink> existing = linkRepository.findByFullName(fullName);
        if (existing.isPresent() && !existing.get().getProjectId().equals(projectId)) {
            linkRepository.delete(existing.get());
        }

        // Remove any existing link for this project
        linkRepository.deleteByProjectId(projectId);

        ProjectGitHubLink link = ProjectGitHubLink.builder()
                .projectId(projectId)
                .userId(userId)
                .repoOwner(repoOwner)
                .repoName(repoName)
                .fullName(fullName)
                .defaultBranch(branch)
                .activeBranch(branch)
                .linkedAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        link = linkRepository.save(link);

        return Map.of(
                "id", link.getId(),
                "fullName", link.getFullName(),
                "defaultBranch", link.getDefaultBranch(),
                "activeBranch", link.getActiveBranch(),
                "linkedAt", link.getLinkedAt().toString()
        );
    }

    public void unlinkProject(String userId, String projectId) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to any repository"));
        if (!link.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        linkRepository.delete(link);
    }

    public Map<String, Object> getLinkedRepo(String userId, String projectId) {
        Optional<ProjectGitHubLink> link = linkRepository.findByProjectId(projectId);
        if (link.isEmpty()) {
            return Map.of("linked", false);
        }
        ProjectGitHubLink l = link.get();
        return Map.of(
                "linked", true,
                "fullName", l.getFullName(),
                "owner", l.getRepoOwner(),
                "repo", l.getRepoName(),
                "defaultBranch", l.getDefaultBranch(),
                "activeBranch", l.getActiveBranch()
        );
    }

    public List<Map<String, Object>> listLinkedRepos(String userId) {
        List<ProjectGitHubLink> links = linkRepository.findByUserId(userId);
        return links.stream().map(link -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("projectId", link.getProjectId());
            m.put("fullName", link.getFullName());
            m.put("repoOwner", link.getRepoOwner());
            m.put("repoName", link.getRepoName());
            m.put("defaultBranch", link.getDefaultBranch());
            m.put("activeBranch", link.getActiveBranch());
            m.put("lastPushedCommitSha", link.getLastPushedCommitSha());
            m.put("lastPushedAt", link.getLastPushedAt() != null ? link.getLastPushedAt().toString() : null);
            m.put("linkedAt", link.getLinkedAt().toString());
            return m;
        }).toList();
    }

    public Map<String, Object> getFileContent(String userId, String owner, String repo, String path, String ref) {
        try {
            ResponseEntity<Map> response = apiClient.get(userId,
                    "/repos/" + owner + "/" + repo + "/contents/" + path + "?ref=" + ref,
                    Map.class);
            Map<String, Object> result = new LinkedHashMap<>(response.getBody());
            String encoded = (String) result.get("content");
            if (encoded != null) {
                String decoded = new String(Base64.getMimeDecoder().decode(encoded));
                result.put("decodedContent", decoded);
            }
            result.put("found", true);
            return result;
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                return Map.of("found", false, "error", "File not found in this repository");
            }
            log.error("Failed to fetch contents for {}/{}: HTTP {} - {}", owner, repo, e.getStatusCode(), e.getResponseBodyAsString());
            return Map.of("found", false, "error", "GitHub API error: " + e.getStatusCode());
        }
    }
}
