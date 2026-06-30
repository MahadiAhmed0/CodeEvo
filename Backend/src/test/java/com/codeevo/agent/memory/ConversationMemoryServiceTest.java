package com.codeevo.agent.memory;

import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.llm.LlmResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationMemoryServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private LlmClient summarizerClient;

    private ConversationMemoryService memoryService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String SESSION = "sess1";
    private static final String PROJECT = "proj1";

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);

        memoryService = new ConversationMemoryService(redisTemplate, objectMapper, summarizerClient);
        ReflectionTestUtils.setField(memoryService, "windowSize", 3);
        ReflectionTestUtils.setField(memoryService, "summarizeThreshold", 5);
        ReflectionTestUtils.setField(memoryService, "sessionTtlSeconds", 86400L);
    }

    @Test
    void addMessage_and_getMessagesForPrompt_roundtrip() {
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages")))).thenReturn(null);

        memoryService.addMessage(SESSION, PROJECT, LlmMessage.user("Hello"));
        memoryService.addMessage(SESSION, PROJECT, LlmMessage.assistant("Hi there"));

        String serialized = "[{\"role\":\"user\",\"content\":\"Hello\"},{\"role\":\"assistant\",\"content\":\"Hi there\"}]";
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages")))).thenReturn(serialized);

        List<LlmMessage> messages = memoryService.getMessagesForPrompt(SESSION, PROJECT);

        assertEquals(2, messages.size());
        assertEquals("Hello", messages.get(0).getContent());
        assertEquals("Hi there", messages.get(1).getContent());
    }

    @Test
    void getMessagesForPrompt_empty_returnsEmptyList() {
        when(valueOps.get(anyString())).thenReturn(null);

        List<LlmMessage> messages = memoryService.getMessagesForPrompt(SESSION, PROJECT);

        assertTrue(messages.isEmpty());
    }

    @Test
    void getMessagesForPrompt_withinWindow_returnsAll() {
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages"))))
                .thenReturn("[{\"role\":\"user\",\"content\":\"A\"},{\"role\":\"user\",\"content\":\"B\"}]");

        List<LlmMessage> messages = memoryService.getMessagesForPrompt(SESSION, PROJECT);

        assertEquals(2, messages.size());
    }

    @Test
    void getMessagesForPrompt_exceedsWindow_returnsRecentPlusSummary() {
        String coreContext = "Previous summary text";
        when(valueOps.get(argThat((String k) -> k != null && k.contains("core_context")))).thenReturn(coreContext);

        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < 5; i++) {
            if (i > 0) json.append(",");
            json.append("{\"role\":\"user\",\"content\":\"Msg").append(i).append("\"}");
        }
        json.append("]");
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages")))).thenReturn(json.toString());

        List<LlmMessage> messages = memoryService.getMessagesForPrompt(SESSION, PROJECT);

        assertEquals(4, messages.size());
        assertTrue(messages.get(0).getContent().contains("Previous conversation summary"));
        assertEquals("Msg2", messages.get(1).getContent());
        assertEquals("Msg3", messages.get(2).getContent());
        assertEquals("Msg4", messages.get(3).getContent());
    }

    @Test
    void addMessage_triggersSummarizationWhenThresholdExceeded() {
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages"))))
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"}]")
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"}]")
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"},{\"role\":\"user\",\"content\":\"Msg3\"}]")
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"},{\"role\":\"user\",\"content\":\"Msg3\"},{\"role\":\"user\",\"content\":\"Msg4\"}]")
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"},{\"role\":\"user\",\"content\":\"Msg3\"},{\"role\":\"user\",\"content\":\"Msg4\"},{\"role\":\"user\",\"content\":\"Msg5\"}]")
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"},{\"role\":\"user\",\"content\":\"Msg3\"},{\"role\":\"user\",\"content\":\"Msg4\"},{\"role\":\"user\",\"content\":\"Msg5\"},{\"role\":\"user\",\"content\":\"Msg6\"}]");

        when(summarizerClient.chat(anyList()))
                .thenReturn(LlmResponse.builder()
                        .stopReason(LlmResponse.StopReason.END_TURN)
                        .textContent("Summarized context")
                        .build());

        for (int i = 0; i < 5; i++) {
            memoryService.addMessage(SESSION, PROJECT, LlmMessage.user("Msg" + (i + 2)));
        }

        verify(summarizerClient, atLeastOnce()).chat(anyList());
    }

    @Test
    void clearSession_removesBothKeys() {
        memoryService.clearSession(SESSION, PROJECT);

        verify(redisTemplate, times(1)).delete(
                argThat((String k) -> k != null && k.contains("messages")));
        verify(redisTemplate, times(1)).delete(
                argThat((String k) -> k != null && k.contains("core_context")));
    }

    @Test
    void getMessagesForPrompt_withInvalidJson_returnsEmpty() {
        when(valueOps.get(anyString())).thenReturn("not-valid-json");

        List<LlmMessage> messages = memoryService.getMessagesForPrompt(SESSION, PROJECT);

        assertTrue(messages.isEmpty());
    }

    @Test
    void addMessage_saveFailure_doesNotThrow() {
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages")))).thenReturn(null);
        doThrow(new RuntimeException("Redis down")).when(valueOps).set(anyString(), anyString(), any(Duration.class));

        memoryService.addMessage(SESSION, PROJECT, LlmMessage.user("test"));
    }

    @Test
    void summarizeOldMessages_belowThreshold_doesNothing() {
        when(valueOps.get(argThat((String k) -> k != null && k.contains("messages"))))
                .thenReturn("[{\"role\":\"user\",\"content\":\"Msg1\"},{\"role\":\"user\",\"content\":\"Msg2\"}]");

        memoryService.summarizeOldMessages(SESSION, PROJECT);

        verify(summarizerClient, never()).chat(anyList());
    }
}
