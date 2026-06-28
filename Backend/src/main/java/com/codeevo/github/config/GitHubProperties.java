package com.codeevo.github.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "codeevo.github")
public class GitHubProperties {

    private String clientId = "";

    private String clientSecret = "";

    private String redirectUri = "http://localhost:3000/auth/github/callback";

    private String webhookSecret = "";

    private String appPrivateKey = "";
}
