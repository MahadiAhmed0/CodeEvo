package com.codeevo.github.controller;

import com.codeevo.github.service.GitHubRepoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github/repos")
@RequiredArgsConstructor
public class GitHubRepoController {

    private final GitHubRepoService repoService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listRepos(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int perPage,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(repoService.listRepositories(userId, page, perPage));
    }

    @GetMapping("/{owner}/{repo}/branches")
    public ResponseEntity<List<Map<String, Object>>> listBranches(
            @PathVariable String owner,
            @PathVariable String repo,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(repoService.listBranches(userId, owner, repo));
    }

    @PostMapping("/link")
    public ResponseEntity<Map<String, Object>> linkProject(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String userId) {
        String projectId = body.get("projectId");
        String repoOwner = body.get("repoOwner");
        String repoName = body.get("repoName");
        String branch = body.getOrDefault("branch", "main");
        return ResponseEntity.ok(repoService.linkProject(userId, projectId, repoOwner, repoName, branch));
    }

    @PostMapping("/unlink")
    public ResponseEntity<Void> unlinkProject(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String userId) {
        repoService.unlinkProject(userId, body.get("projectId"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/link/{projectId}")
    public ResponseEntity<Map<String, Object>> getLinkedRepo(
            @PathVariable String projectId,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(repoService.getLinkedRepo(userId, projectId));
    }

    @GetMapping("/linked")
    public ResponseEntity<List<Map<String, Object>>> listLinkedRepos(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(repoService.listLinkedRepos(userId));
    }

    @GetMapping("/{owner}/{repo}/contents/{*path}")
    public ResponseEntity<Map<String, Object>> getFileContent(
            @PathVariable String owner,
            @PathVariable String repo,
            @PathVariable String path,
            @RequestParam(defaultValue = "main") String ref,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(repoService.getFileContent(userId, owner, repo, path, ref));
    }
}
