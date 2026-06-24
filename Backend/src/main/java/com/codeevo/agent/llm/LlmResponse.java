package com.codeevo.agent.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Parsed response from the LLM API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmResponse {

    public enum StopReason { END_TURN, TOOL_USE, LENGTH, ERROR }

    private StopReason stopReason;
    private String textContent;
    private List<LlmToolCall> toolCalls;
    /** Raw token usage for cost tracking */
    private int inputTokens;
    private int outputTokens;

    public boolean isToolUse() {
        return stopReason == StopReason.TOOL_USE && toolCalls != null && !toolCalls.isEmpty();
    }

    public boolean isEndTurn() {
        return stopReason == StopReason.END_TURN;
    }
}
