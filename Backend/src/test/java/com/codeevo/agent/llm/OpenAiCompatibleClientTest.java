package com.codeevo.agent.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import okhttp3.OkHttpClient;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class OpenAiCompatibleClientTest {

    private MockWebServer server;
    private OpenAiCompatibleClient client;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        server = new MockWebServer();
        OkHttpClient httpClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .writeTimeout(5, TimeUnit.SECONDS)
                .build();
        client = new OpenAiCompatibleClient(
                httpClient, objectMapper,
                server.url("/").toString(),
                "test-api-key",
                "test-model",
                4096,
                0.3);
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void chat_parsesSuccessfulResponse() throws Exception {
        String json = """
                {
                  "id": "chatcmpl-123",
                  "object": "chat.completion",
                  "choices": [{
                    "index": 0,
                    "finish_reason": "stop",
                    "message": {
                      "role": "assistant",
                      "content": "Hello! How can I help?"
                    }
                  }],
                  "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 10
                  }
                }
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.END_TURN, response.getStopReason());
        assertEquals("Hello! How can I help?", response.getTextContent());
        assertNull(response.getToolCalls());
        assertEquals(50, response.getInputTokens());
        assertEquals(10, response.getOutputTokens());
    }

    @Test
    void chat_parsesToolCallResponse() throws Exception {
        String json = """
                {
                  "id": "chatcmpl-456",
                  "choices": [{
                    "index": 0,
                    "finish_reason": "tool_calls",
                    "message": {
                      "role": "assistant",
                      "content": null,
                      "tool_calls": [{
                        "id": "call-1",
                        "type": "function",
                        "function": {
                          "name": "search_project_context",
                          "arguments": "{\\"query\\":\\"auth\\",\\"language\\":\\"java\\"}"
                        }
                      }]
                    }
                  }],
                  "usage": {"prompt_tokens": 60, "completion_tokens": 20}
                }
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Find auth code")));

        assertEquals(LlmResponse.StopReason.TOOL_USE, response.getStopReason());
        assertNull(response.getTextContent());
        assertNotNull(response.getToolCalls());
        assertEquals(1, response.getToolCalls().size());
        assertEquals("call-1", response.getToolCalls().get(0).getId());
        assertEquals("search_project_context", response.getToolCalls().get(0).getName());
        assertEquals("auth", response.getToolCalls().get(0).getArguments().path("query").asText());
    }

    @Test
    void chat_handlesHttpError() {
        server.enqueue(new MockResponse()
                .setResponseCode(401)
                .setBody("{\"error\":{\"message\":\"Invalid API key\"}}")
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.ERROR, response.getStopReason());
        assertTrue(response.getTextContent().contains("Invalid API key") || response.getTextContent().contains("401"));
    }

    @Test
    void chat_handlesMalformedResponse() {
        server.enqueue(new MockResponse()
                .setBody("not-json-at-all")
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.ERROR, response.getStopReason());
    }

    @Test
    void chat_handlesEmptyChoicesResponse() {
        String json = """
                {"id":"x","object":"chat.completion","choices":[],"usage":{}}
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.ERROR, response.getStopReason());
    }

    @Test
    void chat_handlesTimeout() {
        server.enqueue(new MockResponse()
                .setBodyDelay(10, TimeUnit.SECONDS)
                .setBody("{}")
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.ERROR, response.getStopReason());
    }

    @Test
    void requestBody_includesParallelToolCallsFalse() throws Exception {
        String json = """
                {"id":"x","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","content":"OK"}}],"usage":{}}
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        List<Map<String, Object>> tools = List.of(
                Map.of("type", "function", "function", Map.of("name", "test_tool", "description", "A test tool"))
        );
        client.chat(List.of(LlmMessage.user("Use a tool")), tools);

        RecordedRequest request = server.takeRequest();
        String body = request.getBody().readUtf8();

        assertTrue(body.contains("\"parallel_tool_calls\":false"),
                "Request body must contain parallel_tool_calls=false, got: " + body);
    }

    @Test
    void chat_withoutTools_omitsToolFields() throws Exception {
        String json = """
                {"id":"x","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","content":"OK"}}],"usage":{}}
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        client.chat(List.of(LlmMessage.user("Hi")));

        RecordedRequest request = server.takeRequest();
        String body = request.getBody().readUtf8();
        assertFalse(body.contains("\"tools\""), "No tools should be in body: " + body);
    }

    @Test
    void chat_passesCorrectHeaders() throws Exception {
        String json = """
                {"id":"x","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","content":"OK"}}],"usage":{}}
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        client.chat(List.of(LlmMessage.user("Hi")));

        RecordedRequest request = server.takeRequest();
        assertEquals("Bearer test-api-key", request.getHeader("Authorization"));
        assertTrue(request.getHeader("Content-Type").startsWith("application/json"));
    }

    @Test
    void chat_parsesLengthStopReason() throws Exception {
        String json = """
                {
                  "id": "x",
                  "choices": [{
                    "index": 0,
                    "finish_reason": "length",
                    "message": {"role": "assistant", "content": "Partial..."}
                  }],
                  "usage": {"prompt_tokens": 10, "completion_tokens": 4096}
                }
                """;
        server.enqueue(new MockResponse()
                .setBody(json)
                .setHeader("Content-Type", "application/json"));

        LlmResponse response = client.chat(List.of(LlmMessage.user("Tell me a long story")));

        assertEquals(LlmResponse.StopReason.LENGTH, response.getStopReason());
        assertEquals("Partial...", response.getTextContent());
    }

    @Test
    void chat_handlesNetworkError() throws Exception {
        server.shutdown();

        LlmResponse response = client.chat(List.of(LlmMessage.user("Hi")));

        assertEquals(LlmResponse.StopReason.ERROR, response.getStopReason());
        assertTrue(response.getTextContent().startsWith("Network error:"));
    }
}
