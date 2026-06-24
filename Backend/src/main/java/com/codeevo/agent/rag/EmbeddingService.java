package com.codeevo.agent.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Calls an OpenAI-compatible /v1/embeddings endpoint to generate dense vector
 * embeddings for code chunks.
 *
 * Default configuration uses Groq's nomic-embed-text model (free tier).
 * Can be swapped to OpenAI text-embedding-3-small or any compatible provider
 * by changing the embedding.* properties in application.properties.
 */
@Slf4j
@Service
public class EmbeddingService {

    private final OkHttpClient http;
    private final ObjectMapper objectMapper;

    @Value("${codeevo.agent.embedding.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${codeevo.agent.embedding.api-key:${codeevo.agent.chat.api-key}}")
    private String apiKey;

    @Value("${codeevo.agent.embedding.model:nomic-embed-text}")
    private String model;

    public EmbeddingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        // Dedicated OkHttp client for embedding calls with shorter timeouts
        this.http = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Generate an embedding for a single text input.
     *
     * @param text The text to embed (typically a code chunk)
     * @return Dense vector as List<Double>, or empty list on failure
     */
    public List<Double> embed(String text) {
        // Truncate very long inputs to stay within model limits
        String truncated = text.length() > 8000 ? text.substring(0, 8000) : text;

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("input", truncated);

        try {
            Request request = new Request.Builder()
                    .url(baseUrl + "/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(
                            objectMapper.writeValueAsString(body),
                            MediaType.get("application/json")))
                    .build();

            try (Response response = http.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    log.warn("Embedding request failed: HTTP {}", response.code());
                    return List.of();
                }

                JsonNode root = objectMapper.readTree(response.body().string());
                JsonNode embeddingNode = root.path("data").path(0).path("embedding");
                if (!embeddingNode.isArray()) {
                    log.warn("Unexpected embedding response shape");
                    return List.of();
                }

                List<Double> vector = new ArrayList<>();
                for (JsonNode v : embeddingNode) {
                    vector.add(v.asDouble());
                }
                return vector;
            }

        } catch (IOException e) {
            log.error("Embedding call failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Batch embed a list of texts. Falls back to sequential if batch fails.
     * Returns empty list for any failed individual embedding.
     */
    public List<List<Double>> embedBatch(List<String> texts) {
        if (texts.isEmpty()) return List.of();

        // Try batch call first
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        ArrayNode inputArray = objectMapper.createArrayNode();
        texts.forEach(t -> inputArray.add(t.length() > 8000 ? t.substring(0, 8000) : t));
        body.set("input", inputArray);

        try {
            Request request = new Request.Builder()
                    .url(baseUrl + "/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .post(RequestBody.create(
                            objectMapper.writeValueAsString(body),
                            MediaType.get("application/json")))
                    .build();

            try (Response response = http.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) {
                    log.warn("Batch embedding failed: HTTP {}. Falling back to sequential.", response.code());
                    return texts.stream().map(this::embed).toList();
                }

                JsonNode root = objectMapper.readTree(response.body().string());
                JsonNode data = root.path("data");
                if (!data.isArray()) {
                    return texts.stream().map(this::embed).toList();
                }

                List<List<Double>> results = new ArrayList<>();
                for (JsonNode item : data) {
                    JsonNode embeddingNode = item.path("embedding");
                    List<Double> vector = new ArrayList<>();
                    for (JsonNode v : embeddingNode) vector.add(v.asDouble());
                    results.add(vector);
                }
                return results;
            }

        } catch (IOException e) {
            log.warn("Batch embedding failed: {}. Falling back to sequential.", e.getMessage());
            return texts.stream().map(this::embed).toList();
        }
    }

    /**
     * Computes cosine similarity between two vectors.
     * Returns a value in [-1, 1] where 1.0 = identical direction.
     */
    public static double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a.isEmpty() || b.isEmpty() || a.size() != b.size()) return 0.0;

        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < a.size(); i++) {
            dot   += a.get(i) * b.get(i);
            normA += a.get(i) * a.get(i);
            normB += b.get(i) * b.get(i);
        }

        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
