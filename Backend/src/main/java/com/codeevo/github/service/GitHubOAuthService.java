package com.codeevo.github.service;

import com.codeevo.github.config.GitHubProperties;
import com.codeevo.github.entity.GitHubToken;
import com.codeevo.github.repository.GitHubTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GitHubOAuthService {

    private final GitHubProperties properties;
    private final GitHubTokenRepository tokenRepository;
    private final GitHubEncryptionService encryptionService;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> handleCallback(String code, String redirect) {
        Map<String, String> tokenRequest = Map.of(
                "client_id", properties.getClientId(),
                "client_secret", properties.getClientSecret(),
                "code", code,
                "redirect_uri", properties.getRedirectUri()
        );

        ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token",
                tokenRequest,
                Map.class
        );

        String accessToken = (String) tokenResponse.getBody().get("access_token");
        if (accessToken == null) {
            throw new RuntimeException("Failed to get GitHub access token");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "CodeEvo");

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> userResponse = restTemplate.exchange(
                "https://api.github.com/user",
                HttpMethod.GET,
                entity,
                Map.class
        );

        Map<String, Object> githubUser = userResponse.getBody();
        String githubUserId = String.valueOf(githubUser.get("id"));
        String githubLogin = (String) githubUser.get("login");
        String githubAvatar = (String) githubUser.get("avatar_url");

        return Map.of(
                "accessToken", accessToken,
                "tokenType", "bearer",
                "githubId", githubUserId,
                "githubLogin", githubLogin,
                "githubAvatar", githubAvatar,
                "redirect", redirect
        );
    }

    public void storeToken(String userId, String accessToken, String githubUserId, String githubLogin, String githubAvatar) {
        GitHubToken token = GitHubToken.builder()
                .userId(userId)
                .accessToken(encryptionService.encrypt(accessToken))
                .tokenType("bearer")
                .scope("repo,user,admin:repo_hook")
                .githubUserId(githubUserId)
                .githubLogin(githubLogin)
                .githubAvatarUrl(githubAvatar)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        tokenRepository.deleteByUserId(userId);
        tokenRepository.save(token);
    }

    public Map<String, Object> getStatus(String userId) {
        Optional<GitHubToken> token = tokenRepository.findByUserId(userId);
        if (token.isEmpty()) {
            return Map.of("connected", false);
        }
        GitHubToken t = token.get();
        return Map.of(
                "connected", true,
                "githubLogin", t.getGithubLogin(),
                "githubAvatarUrl", t.getGithubAvatarUrl(),
                "githubUserId", t.getGithubUserId(),
                "profileUrl", "https://github.com/" + t.getGithubLogin(),
                "connectedAt", t.getCreatedAt().toString()
        );
    }

    public void disconnect(String userId) {
        tokenRepository.deleteByUserId(userId);
    }
}
