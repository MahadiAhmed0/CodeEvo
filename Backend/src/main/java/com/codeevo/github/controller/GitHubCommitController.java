package com.codeevo.github.controller;

import com.codeevo.github.service.GitHubCommitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github/commits")
@RequiredArgsConstructor
public class GitHubCommitController {

    private final GitHubCommitService commitService;

    @GetMapping("/{projectId}")
    public ResponseEntity<List<Map<String, Object>>> listCommits(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int perPage,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String author,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(commitService.listCommits(userId, projectId, page, perPage, branch, author));
    }

    @GetMapping("/{projectId}/detail/{sha}")
    public ResponseEntity<Map<String, Object>> getCommit(
            @PathVariable String projectId,
            @PathVariable String sha,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(commitService.getCommitDetail(userId, projectId, sha));
    }

    @GetMapping("/{projectId}/compare")
    public ResponseEntity<Map<String, Object>> compareCommits(
            @PathVariable String projectId,
            @RequestParam String base,
            @RequestParam String head,
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(commitService.compareCommits(userId, projectId, base, head));
    }
}
