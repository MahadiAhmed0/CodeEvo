package com.codeevo.github.controller;

import com.codeevo.github.service.GitHubPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/github/push")
@RequiredArgsConstructor
public class GitHubPushController {

    private final GitHubPushService pushService;

    @PostMapping("/{projectId}")
    public ResponseEntity<Map<String, Object>> pushToGitHub(
            @PathVariable String projectId,
            @RequestBody Map<String, String> body,
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        String branch = body.getOrDefault("branch", null);
        String message = body.getOrDefault("message", "CodeEvo: Update project code");
        boolean createPr = Boolean.parseBoolean(body.getOrDefault("createPr", "false"));
        String prTitle = body.getOrDefault("prTitle", "");
        return ResponseEntity.ok(pushService.pushCode(userId, projectId, branch, message, createPr, prTitle));
    }

    @GetMapping("/status/{projectId}")
    public ResponseEntity<Map<String, Object>> getPushStatus(
            @PathVariable String projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(pushService.getPushStatus(userId, projectId));
    }

    @GetMapping("/diff/{projectId}")
    public ResponseEntity<Map<String, Object>> getSyncDiff(
            @PathVariable String projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(pushService.getSyncDiff(userId, projectId));
    }
}
