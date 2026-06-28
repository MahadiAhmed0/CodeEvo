package com.codeevo.agent.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Strongly-typed binding for all codeevo.agent.* properties in application.properties.
 * All model names, providers, API keys, and token budgets are read from here.
 * Zero LLM model names are hardcoded in Java code.
 */
@Data
@ConfigurationProperties(prefix = "codeevo.agent")
public class AgentModelProperties {

    private SupervisorConfig supervisor = new SupervisorConfig();
    private AgentConfig chat = new AgentConfig();
    private AgentConfig architect = new AgentConfig();
    private AgentConfig coding = new AgentConfig();
    private AgentConfig summarizer = new AgentConfig();

    private MemoryConfig memory = new MemoryConfig();
    private CacheConfig cache = new CacheConfig();
    private SessionConfig session = new SessionConfig();
    private PermissionConfig permission = new PermissionConfig();

    @Data
    public static class PermissionConfig {
        /** Timeout in seconds for pending user permission/approval requests.
         *  If the user doesn't respond within this window, the request auto-rejects. */
        private long timeoutSeconds = 300;
    }

    @Data
    public static class SupervisorConfig {
        /** Display name shown in UI events */
        private String name = "CodeEvo Supervisor";
    }

    @Data
    public static class AgentConfig {
        /** Display name shown in UI events and audit logs */
        private String name;

        /**
         * LLM provider: GROQ | OPENAI | OPENROUTER | GEMINI | OLLAMA
         * All use the OpenAI-compatible /v1/chat/completions format.
         */
        private String provider;

        /** Model identifier as accepted by the provider (e.g. llama3-70b-8192) */
        private String model;

        /** API key. Injected via environment variable in production. */
        private String apiKey;

        /** Base URL for the OpenAI-compatible endpoint */
        private String baseUrl;

        /** Maximum output tokens for this agent's calls */
        private int maxTokens = 4096;

        /** Sampling temperature (0.0 = deterministic, 1.0 = creative) */
        private double temperature = 0.3;

        /** Max self-correction retries before escalating to user (Coding Agent only) */
        private int maxSelfCorrectionAttempts = 3;
    }

    @Data
    public static class MemoryConfig {
        /** Number of recent messages kept in full (sliding window) */
        private int windowSize = 10;

        /** Message count that triggers background summarization */
        private int summarizeThreshold = 15;
    }

    @Data
    public static class CacheConfig {
        /** TTL (seconds) for semantic response cache entries in Redis */
        private long ttlSeconds = 3600;
    }

    @Data
    public static class SessionConfig {
        /** TTL (seconds) for session message store in Redis */
        private long ttlSeconds = 86400;
    }
}
