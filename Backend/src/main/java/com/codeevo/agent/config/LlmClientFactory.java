package com.codeevo.agent.config;

import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.OpenAiCompatibleClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import okhttp3.OkHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Creates named {@link LlmClient} beans for each agent using config from
 * {@link AgentModelProperties}. All clients use the OpenAI-compatible REST API
 * format, which is supported by Groq, Gemini (via OpenAI-compat endpoint),
 * OpenRouter, Ollama, and standard OpenAI.
 */
@Configuration
@RequiredArgsConstructor
public class LlmClientFactory {

    private final AgentModelProperties props;
    private final ObjectMapper objectMapper;

    @Bean(name = "chatLlmClient")
    public LlmClient chatLlmClient() {
        return buildClient(props.getChat());
    }

    @Bean(name = "architectLlmClient")
    public LlmClient architectLlmClient() {
        return buildClient(props.getArchitect());
    }

    @Bean(name = "codingLlmClient")
    public LlmClient codingLlmClient() {
        return buildClient(props.getCoding());
    }

    @Bean(name = "summarizerLlmClient")
    public LlmClient summarizerLlmClient() {
        return buildClient(props.getSummarizer());
    }

    /**
     * Shared OkHttpClient with generous timeouts for LLM streaming calls.
     */
    @Bean
    public OkHttpClient sharedOkHttpClient() {
        return new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(600, TimeUnit.SECONDS)
                .writeTimeout(600, TimeUnit.SECONDS)
                .build();
    }

    private LlmClient buildClient(AgentModelProperties.AgentConfig cfg) {
        return new OpenAiCompatibleClient(
                sharedOkHttpClient(),
                objectMapper,
                cfg.getBaseUrl(),
                cfg.getApiKey(),
                cfg.getModel(),
                cfg.getMaxTokens(),
                cfg.getTemperature()
        );
    }
}
