package com.codeevo.github.service;

import com.codeevo.github.entity.ProjectGitHubLink;
import com.codeevo.github.repository.ProjectGitHubLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import org.springframework.web.client.HttpClientErrorException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GitHubCommitService {

    private final GitHubApiClient apiClient;
    private final ProjectGitHubLinkRepository linkRepository;

    public List<Map<String, Object>> listCommits(String userId, String projectId, int page, int perPage,
                                                  String branch, String author) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));
        if (!apiClient.hasToken(userId)) return List.of();

        String branchParam = branch != null ? branch : link.getActiveBranch();
        String path = "/repos/" + link.getFullName() + "/commits" +
                "?page=" + page + "&per_page=" + perPage;

        if (branchParam != null) {
            path += "&sha=" + branchParam;
        }
        if (author != null) {
            path += "&author=" + author;
        }

        List<Map<String, Object>> commits = new ArrayList<>();
        ResponseEntity<Map[]> response;
        try {
            response = apiClient.get(userId, path, Map[].class);
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 409 || status == 404) {
                return commits;
            }
            throw e;
        }

        for (Map<String, Object> raw : Objects.requireNonNull(response.getBody())) {
            Map<String, Object> commit = (Map<String, Object>) raw.get("commit");
            Map<String, Object> committer = (Map<String, Object>) commit.get("committer");
            Map<String, Object> authorInfo = (Map<String, Object>) commit.get("author");

            Map<String, Object> simplified = new LinkedHashMap<>();
            simplified.put("sha", raw.get("sha"));
            simplified.put("message", ((String) commit.get("message")).split("\n")[0]);
            simplified.put("author", authorInfo != null ? authorInfo.get("name") : "Unknown");
            simplified.put("authorEmail", authorInfo != null ? authorInfo.get("email") : "");
            simplified.put("date", committer != null ? committer.get("date") : "");
            simplified.put("url", raw.get("html_url"));

            Map<String, Object> rawStats = (Map<String, Object>) raw.get("stats");
            simplified.put("stats", rawStats != null ? rawStats : Map.of("additions", 0, "deletions", 0, "total", 0));

            commits.add(simplified);
        }

        return commits;
    }

    public Map<String, Object> getCommitDetail(String userId, String projectId, String sha) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));

        ResponseEntity<Map> response = apiClient.get(userId,
                "/repos/" + link.getFullName() + "/commits/" + sha,
                Map.class);

        Map<String, Object> raw = response.getBody();
        Map<String, Object> result = new LinkedHashMap<>();

        Map<String, Object> commit = (Map<String, Object>) raw.get("commit");
        Map<String, Object> committer = (Map<String, Object>) commit.get("committer");
        Map<String, Object> authorInfo = (Map<String, Object>) commit.get("author");
        Map<String, Object> stats = (Map<String, Object>) raw.get("stats");
        List<Map<String, Object>> files = (List<Map<String, Object>>) raw.get("files");

        result.put("sha", raw.get("sha"));
        result.put("message", commit.get("message"));
        result.put("author", authorInfo != null ? authorInfo.get("name") : "Unknown");
        result.put("authorEmail", authorInfo != null ? authorInfo.get("email") : "");
        result.put("date", committer != null ? committer.get("date") : "");
        result.put("url", raw.get("html_url"));
        result.put("stats", stats != null ? stats : Map.of("additions", 0, "deletions", 0, "total", 0));
        result.put("files", files != null ? files : List.of());

        return result;
    }

    public Map<String, Object> compareCommits(String userId, String projectId, String base, String head) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));

        ResponseEntity<Map> response = apiClient.get(userId,
                "/repos/" + link.getFullName() + "/compare/" + base + "..." + head,
                Map.class);

        Map<String, Object> raw = response.getBody();
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("status", raw.get("status"));
        result.put("aheadBy", raw.get("ahead_by"));
        result.put("behindBy", raw.get("behind_by"));
        result.put("totalCommits", raw.get("total_commits"));
        result.put("files", raw.get("files"));

        return result;
    }
}
