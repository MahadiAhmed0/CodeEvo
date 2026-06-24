package com.codeevo.agent.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single message in the LLM conversation context.
 * Compatible with OpenAI-format message arrays.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmMessage {

    public enum Role { system, user, assistant, tool }

    private Role role;
    private String content;

    /** For tool result messages: the tool_call_id this result answers */
    private String toolCallId;

    /** For assistant messages that contain tool calls */
    private java.util.List<LlmToolCall> toolCalls;

    // ─── Convenience factories ─────────────────────────────────────────────

    public static LlmMessage system(String content) {
        return LlmMessage.builder().role(Role.system).content(content).build();
    }

    public static LlmMessage user(String content) {
        return LlmMessage.builder().role(Role.user).content(content).build();
    }

    public static LlmMessage assistant(String content) {
        return LlmMessage.builder().role(Role.assistant).content(content).build();
    }

    public static LlmMessage assistantWithTools(java.util.List<LlmToolCall> toolCalls) {
        return LlmMessage.builder().role(Role.assistant).toolCalls(toolCalls).build();
    }

    public static LlmMessage toolResult(String toolCallId, String content) {
        return LlmMessage.builder()
                .role(Role.tool)
                .toolCallId(toolCallId)
                .content(content)
                .build();
    }
}
