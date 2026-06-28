package com.codeevo.github.service;

import com.codeevo.github.entity.GitHubToken;
import com.codeevo.github.repository.GitHubTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GitHubApiClient {

    private final GitHubTokenRepository tokenRepository;
    private final GitHubEncryptionService encryptionService;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GITHUB_API = "https://api.github.com";

    public boolean hasToken(String userId) {
        return tokenRepository.findByUserId(userId).isPresent();
    }

    private String getToken(String userId) {
        GitHubToken token = tokenRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("GitHub not connected for user " + userId));
        return encryptionService.decrypt(token.getAccessToken());
    }

    private HttpHeaders authHeaders(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getToken(userId));
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("User-Agent", "CodeEvo");
        return headers;
    }

    public <T> ResponseEntity<T> get(String userId, String path, Class<T> responseType) {
        HttpEntity<Void> entity = new HttpEntity<>(authHeaders(userId));
        return restTemplate.exchange(GITHUB_API + path, HttpMethod.GET, entity, responseType);
    }

    public <T, R> ResponseEntity<R> post(String userId, String path, T body, Class<R> responseType) {
        HttpEntity<T> entity = new HttpEntity<>(body, authHeaders(userId));
        return restTemplate.exchange(GITHUB_API + path, HttpMethod.POST, entity, responseType);
    }

    public <T, R> ResponseEntity<R> put(String userId, String path, T body, Class<R> responseType) {
        HttpEntity<T> entity = new HttpEntity<>(body, authHeaders(userId));
        return restTemplate.exchange(GITHUB_API + path, HttpMethod.PUT, entity, responseType);
    }

    public ResponseEntity<Void> delete(String userId, String path) {
        HttpEntity<Void> entity = new HttpEntity<>(authHeaders(userId));
        return restTemplate.exchange(GITHUB_API + path, HttpMethod.DELETE, entity, Void.class);
    }
}
