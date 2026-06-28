package com.codeevo.github.controller;

import com.codeevo.github.config.GitHubProperties;
import com.codeevo.github.service.GitHubOAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/github/auth")
@RequiredArgsConstructor
public class GitHubOAuthController {

    private final GitHubProperties properties;
    private final GitHubOAuthService oauthService;

    @GetMapping("/login")
    public ResponseEntity<Void> login(@RequestParam(defaultValue = "/dashboard") String redirect) {
        String authorizeUrl = "https://github.com/login/oauth/authorize" +
                "?client_id=" + properties.getClientId() +
                "&redirect_uri=" + properties.getRedirectUri() +
                "&scope=repo,user,admin:repo_hook" +
                "&state=" + redirect;
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(authorizeUrl)).build();
    }

    @PostMapping("/callback")
    public ResponseEntity<Map<String, Object>> callback(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String redirect = body.getOrDefault("redirect", "/dashboard");
        Map<String, Object> result = oauthService.handleCallback(code, redirect);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(oauthService.getStatus(userId));
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal String userId) {
        oauthService.disconnect(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/store")
    public ResponseEntity<Void> store(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String userId) {
        oauthService.storeToken(
                userId,
                body.get("accessToken"),
                body.get("githubId"),
                body.get("githubLogin"),
                body.get("githubAvatar")
        );
        return ResponseEntity.ok().build();
    }
}
