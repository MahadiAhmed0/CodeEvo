package com.codeevo.github.service;

import com.codeevo.github.entity.ProjectGitHubLink;
import com.codeevo.github.repository.ProjectGitHubLinkRepository;
import com.codeevo.github.config.GitHubProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubWebhookService {

    private final GitHubApiClient apiClient;
    private final ProjectGitHubLinkRepository linkRepository;
    private final GitHubProperties properties;
    private final ObjectMapper objectMapper;

    public boolean verifySignature(String payload, String signature, String secret) {
        if (secret == null || secret.isEmpty()) return true;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes());
            String expected = "sha256=" + bytesToHex(hash);
            return expected.equals(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to verify webhook signature", e);
            return false;
        }
    }

    public void processEvent(String event, String deliveryId, String payload) {
        log.info("Received webhook event: {} (delivery: {})", event, deliveryId);

        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);

            switch (event) {
                case "push" -> handlePushEvent(data);
                case "pull_request" -> handlePullRequestEvent(data);
                case "issues" -> handleIssueEvent(data);
                default -> log.debug("Unhandled webhook event: {}", event);
            }
        } catch (Exception e) {
            log.error("Failed to process webhook event: {}", event, e);
        }
    }

    private void handlePushEvent(Map<String, Object> data) {
        String fullName = (String) ((Map<String, Object>) data.get("repository")).get("full_name");
        log.info("Push event for repository: {}", fullName);
    }

    private void handlePullRequestEvent(Map<String, Object> data) {
        String action = (String) data.get("action");
        log.info("Pull request event: {}", action);
    }

    private void handleIssueEvent(Map<String, Object> data) {
        String action = (String) data.get("action");
        log.info("Issue event: {}", action);
    }

    public Map<String, Object> registerWebhook(String userId, String projectId) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));

        String webhookUrl = "https://your-domain.com/api/github/webhook";

        Map<String, Object> config = Map.of(
                "url", webhookUrl,
                "content_type", "json",
                "secret", properties.getWebhookSecret(),
                "insecure_ssl", "0"
        );

        Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("push", "pull_request", "issues", "commit_comment"),
                "config", config
        );

        ResponseEntity<Map> response = apiClient.post(userId,
                "/repos/" + link.getFullName() + "/hooks",
                body,
                Map.class);

        Map<String, Object> responseBody = response.getBody();
        String webhookId = String.valueOf(responseBody.get("id"));

        link.setWebhookId(webhookId);
        linkRepository.save(link);

        return Map.of(
                "registered", true,
                "webhookId", webhookId
        );
    }

    public void removeWebhook(String userId, String projectId) {
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new RuntimeException("Project not linked to GitHub"));

        if (link.getWebhookId() != null) {
            try {
                apiClient.delete(userId,
                        "/repos/" + link.getFullName() + "/hooks/" + link.getWebhookId());
            } catch (Exception e) {
                log.warn("Failed to delete webhook: {}", e.getMessage());
            }
            link.setWebhookId(null);
            linkRepository.save(link);
        }
    }

    private String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
