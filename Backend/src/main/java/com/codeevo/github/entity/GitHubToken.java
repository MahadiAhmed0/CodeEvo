package com.codeevo.github.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "github_tokens")
public class GitHubToken {

    @Id
    private String id;

    private String userId;

    private String accessToken;

    private String refreshToken;

    private String tokenType;

    private String scope;

    private String githubUserId;

    private String githubLogin;

    private String githubAvatarUrl;

    private Instant expiresAt;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
