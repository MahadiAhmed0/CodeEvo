package com.codeevo.github.controller;

import com.codeevo.github.config.GitHubProperties;
import com.codeevo.github.service.GitHubWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/github/webhook")
@RequiredArgsConstructor
public class GitHubWebhookController {

    private final GitHubProperties properties;
    private final GitHubWebhookService webhookService;

    @PostMapping
    public ResponseEntity<Void> receiveEvent(
            HttpServletRequest request,
            @RequestBody String payload,
            @RequestHeader("X-Hub-Signature-256") String signature,
            @RequestHeader("X-GitHub-Event") String event,
            @RequestHeader("X-Hub-Id") String deliveryId) {

        if (!webhookService.verifySignature(payload, signature, properties.getWebhookSecret())) {
            return ResponseEntity.status(401).build();
        }

        webhookService.processEvent(event, deliveryId, payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register/{projectId}")
    public ResponseEntity<Map<String, Object>> registerWebhook(
            @PathVariable String projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(webhookService.registerWebhook(userId, projectId));
    }

    @PostMapping("/remove/{projectId}")
    public ResponseEntity<Void> removeWebhook(
            @PathVariable String projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal String userId) {
        webhookService.removeWebhook(userId, projectId);
        return ResponseEntity.ok().build();
    }
}
