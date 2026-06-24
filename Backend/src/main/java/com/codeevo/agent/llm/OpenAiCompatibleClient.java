package com.codeevo.agent.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenAI-compatible HTTP client that works with any provider implementing
 * the /v1/chat/completions REST API. This includes:
 *   - Groq        (https://api.groq.com/openai/v1)
 *   - Gemini      (https://generativelanguage.googleapis.com/v1beta/openai)
 *   - OpenRouter  (https://openrouter.ai/api/v1)
 *   - Ollama      (http://localhost:11434/v1)
 *   - OpenAI      (https://api.openai.com/v1)
 *
 * All configuration is injected via constructor — no Spring dependencies here.
 * This class is instantiated by {@link com.codeevo.agent.config.LlmClientFactory}.
 */
@Slf4j
@RequiredArgsConstructor
public class OpenAiCompatibleClient implements LlmClient {

    private static final MediaType JSON_MEDIA = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int maxTokens;
    private final double temperature;

    @Override
    public LlmResponse chat(List<LlmMessage> messages, List<Map<String, Object>> tools) {
        try {
            ObjectNode body = buildRequestBody(messages, tools);
            String url = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";

            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(objectMapper.writeValueAsString(body), JSON_MEDIA))
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "(empty)";
                    log.error("LLM API error {}: {}", response.code(), errorBody);

                    String userMessage = "LLM API returned HTTP " + response.code();
                    try {
                        JsonNode errorNode = objectMapper.readTree(errorBody);
                        if (errorNode.isArray() && errorNode.has(0) && errorNode.get(0).has("error")) {
                            userMessage = errorNode.get(0).path("error").path("message").asText(userMessage);
                        } else if (errorNode.has("error")) {
                            userMessage = errorNode.path("error").path("message").asText(userMessage);
                        }
                    } catch (Exception ignored) {
                        // Keep default message if parsing fails
                        userMessage += ": " + errorBody;
                    }

                    return LlmResponse.builder()
                            .stopReason(LlmResponse.StopReason.ERROR)
                            .textContent(userMessage)
                            .build();
                }

                String bodyStr = response.body().string();
                return parseResponse(bodyStr);
            }

        } catch (IOException e) {
            log.error("LLM HTTP call failed", e);
            // Clear the thread's interrupted flag in case OkHttp's AsyncTimeout set it.
            // This prevents the subsequent Redis operations from throwing RedisSystemException.
            Thread.interrupted();
            
            return LlmResponse.builder()
                    .stopReason(LlmResponse.StopReason.ERROR)
                    .textContent("Network error: " + e.getMessage())
                    .build();
        }
    }

    // ─── Request Builder ───────────────────────────────────────────────────────

    private ObjectNode buildRequestBody(List<LlmMessage> messages, List<Map<String, Object>> tools) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", maxTokens);
        body.put("temperature", temperature);

        ArrayNode msgs = body.putArray("messages");
        for (LlmMessage msg : messages) {
            ObjectNode m = objectMapper.createObjectNode();
            m.put("role", msg.getRole().name());

            if (msg.getContent() != null) {
                m.put("content", msg.getContent());
            }
            if (msg.getToolCallId() != null) {
                m.put("tool_call_id", msg.getToolCallId());
            }
            if (msg.getToolCalls() != null && !msg.getToolCalls().isEmpty()) {
                ArrayNode tcArray = m.putArray("tool_calls");
                for (LlmToolCall tc : msg.getToolCalls()) {
                    ObjectNode tcNode = objectMapper.createObjectNode();
                    tcNode.put("id", tc.getId());
                    tcNode.put("type", "function");
                    ObjectNode fn = tcNode.putObject("function");
                    fn.put("name", tc.getName());
                    try {
                        fn.put("arguments", objectMapper.writeValueAsString(tc.getArguments()));
                    } catch (Exception e) {
                        fn.put("arguments", "{}");
                    }
                    tcArray.add(tcNode);
                }
            }
            msgs.add(m);
        }

        if (tools != null && !tools.isEmpty()) {
            try {
                body.set("tools", objectMapper.valueToTree(tools));
                body.put("tool_choice", "auto");
                // Disable parallel tool calls — prevents the model from generating
                // Hermes-style XML <function=...> output instead of JSON tool_calls.
                body.put("parallel_tool_calls", false);
            } catch (Exception e) {
                log.warn("Failed to serialize tools", e);
            }
        }

        return body;
    }

    // ─── Response Parser ──────────────────────────────────────────────────────

    private LlmResponse parseResponse(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);

        // Gemini occasionally returns errors as a JSON array instead of a 400 object
        if (root.isArray() && root.has(0) && root.get(0).has("error")) {
            String errorMsg = root.get(0).path("error").path("message").asText("Unknown error");
            log.error("LLM API returned error array: {}", errorMsg);
            return LlmResponse.builder()
                    .stopReason(LlmResponse.StopReason.ERROR)
                    .textContent("API Error: " + errorMsg)
                    .build();
        }

        JsonNode choice = root.path("choices").get(0);
        if (choice == null || choice.isMissingNode()) {
            log.error("LLM API returned malformed response: {}", json);
            return LlmResponse.builder()
                    .stopReason(LlmResponse.StopReason.ERROR)
                    .textContent("API returned an unexpected response format.")
                    .build();
        }

        String finishReason = choice.path("finish_reason").asText("stop");
        JsonNode message = choice.path("message");

        int inputTokens = root.path("usage").path("prompt_tokens").asInt(0);
        int outputTokens = root.path("usage").path("completion_tokens").asInt(0);

        LlmResponse.StopReason stopReason = switch (finishReason) {
            case "tool_calls" -> LlmResponse.StopReason.TOOL_USE;
            case "length" -> LlmResponse.StopReason.LENGTH;
            default -> LlmResponse.StopReason.END_TURN;
        };

        String textContent = message.path("content").isNull() ? null : message.path("content").asText(null);

        List<LlmToolCall> toolCalls = new ArrayList<>();
        if (message.has("tool_calls") && !message.path("tool_calls").isNull()) {
            for (JsonNode tc : message.path("tool_calls")) {
                JsonNode fn = tc.path("function");
                JsonNode argsNode;
                // Arguments may come as a string (needs parsing) or already as JSON
                JsonNode rawArgs = fn.path("arguments");
                if (rawArgs.isTextual()) {
                    argsNode = objectMapper.readTree(rawArgs.asText());
                } else {
                    argsNode = rawArgs;
                }
                toolCalls.add(LlmToolCall.builder()
                        .id(tc.path("id").asText())
                        .type("function")
                        .name(fn.path("name").asText())
                        .arguments(argsNode)
                        .build());
            }
        }

        return LlmResponse.builder()
                .stopReason(stopReason)
                .textContent(textContent)
                .toolCalls(toolCalls.isEmpty() ? null : toolCalls)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .build();
    }
}
