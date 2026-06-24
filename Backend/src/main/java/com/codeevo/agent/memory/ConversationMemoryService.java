package com.codeevo.agent.memory;

import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.llm.LlmResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Manages conversation memory for the Chat AI agent.
 *
 * Implements a sliding-window + summarization strategy:
 * - Keeps the last {@code windowSize} raw messages in Redis
 * - When count exceeds {@code summarizeThreshold}, compresses old messages
 *   using the lightweight summarizer model and stores a "core context" summary
 * - Prepends the summary as a system message in the next prompt
 */
@Slf4j
@Service
public class ConversationMemoryService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final LlmClient summarizerClient;

    public ConversationMemoryService(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Qualifier("summarizerLlmClient") LlmClient summarizerClient) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.summarizerClient = summarizerClient;
    }

    @Value("${codeevo.agent.memory.window-size:10}")
    private int windowSize;

    @Value("${codeevo.agent.memory.summarize-threshold:15}")
    private int summarizeThreshold;

    @Value("${codeevo.agent.session.ttl-seconds:86400}")
    private long sessionTtlSeconds;

    private static final String MSG_KEY = "session:%s:project:%s:messages";
    private static final String CTX_KEY = "session:%s:project:%s:core_context";

    /**
     * Retrieves the message list to inject into the next LLM prompt.
     * Returns up to windowSize recent messages, prepended with the summary if available.
     */
    public List<LlmMessage> getMessagesForPrompt(String sessionId, String projectId) {
        List<LlmMessage> all = loadMessages(sessionId, projectId);

        if (all.size() <= windowSize) {
            return all;
        }

        // Keep only the most recent windowSize messages
        List<LlmMessage> recent = new ArrayList<>(all.subList(all.size() - windowSize, all.size()));

        // Prepend summary as system context
        String coreContext = redisTemplate.opsForValue().get(contextKey(sessionId, projectId));
        if (coreContext != null && !coreContext.isBlank()) {
            recent.add(0, LlmMessage.system("Previous conversation summary:\n" + coreContext));
        }

        return recent;
    }

    /**
     * Appends a new message to the session's Redis store.
     * Triggers async summarization if threshold is exceeded.
     */
    public void addMessage(String sessionId, String projectId, LlmMessage message) {
        List<LlmMessage> messages = loadMessages(sessionId, projectId);
        messages.add(message);
        saveMessages(sessionId, projectId, messages);

        if (messages.size() > summarizeThreshold) {
            summarizeOldMessages(sessionId, projectId);
        }
    }

    /**
     * Asynchronously compresses the oldest messages into a summary string
     * and saves it to Redis, then removes those old messages from the list.
     */
    @Async
    public void summarizeOldMessages(String sessionId, String projectId) {
        List<LlmMessage> messages = loadMessages(sessionId, projectId);
        if (messages.size() <= windowSize) return;

        int toSummarize = messages.size() - windowSize;
        List<LlmMessage> oldMessages = messages.subList(0, toSummarize);

        String prompt = buildSummaryPrompt(oldMessages);
        try {
            LlmResponse response = summarizerClient.chat(List.of(
                    LlmMessage.system("You are a concise conversation summarizer. Produce a 3-5 sentence summary of the key decisions and actions taken."),
                    LlmMessage.user(prompt)
            ));
            String summary = response.getTextContent();
            if (summary != null && !summary.isBlank()) {
                redisTemplate.opsForValue().set(
                        contextKey(sessionId, projectId), summary,
                        Duration.ofSeconds(sessionTtlSeconds)
                );
                // Remove the old messages we just summarized
                List<LlmMessage> remaining = new ArrayList<>(messages.subList(toSummarize, messages.size()));
                saveMessages(sessionId, projectId, remaining);
                log.info("Summarized {} old messages for session {} project {}", toSummarize, sessionId, projectId);
            }
        } catch (Exception e) {
            log.warn("Failed to summarize messages for session {} project {}: {}", sessionId, projectId, e.getMessage());
        }
    }

    public void clearSession(String sessionId, String projectId) {
        redisTemplate.delete(messageKey(sessionId, projectId));
        redisTemplate.delete(contextKey(sessionId, projectId));
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private List<LlmMessage> loadMessages(String sessionId, String projectId) {
        String json = redisTemplate.opsForValue().get(messageKey(sessionId, projectId));
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<LlmMessage>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize messages for session {} project {}", sessionId, projectId);
            return new ArrayList<>();
        }
    }

    private void saveMessages(String sessionId, String projectId, List<LlmMessage> messages) {
        try {
            String json = objectMapper.writeValueAsString(messages);
            redisTemplate.opsForValue().set(
                    messageKey(sessionId, projectId), json,
                    Duration.ofSeconds(sessionTtlSeconds)
            );
        } catch (Exception e) {
            log.error("Failed to save messages for session {} project {}", sessionId, projectId, e);
        }
    }

    private String buildSummaryPrompt(List<LlmMessage> messages) {
        StringBuilder sb = new StringBuilder("Conversation to summarize:\n\n");
        for (LlmMessage m : messages) {
            sb.append(m.getRole().name().toUpperCase()).append(": ")
              .append(m.getContent() != null ? m.getContent() : "[tool call]")
              .append("\n");
        }
        return sb.toString();
    }

    private String messageKey(String sessionId, String projectId) {
        return String.format(MSG_KEY, sessionId, projectId);
    }

    private String contextKey(String sessionId, String projectId) {
        return String.format(CTX_KEY, sessionId, projectId);
    }
}
