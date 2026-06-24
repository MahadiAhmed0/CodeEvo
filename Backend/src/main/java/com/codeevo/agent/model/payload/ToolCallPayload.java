package com.codeevo.agent.model.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Payload for TOOL_CALL and TOOL_RESULT events.
 * Rendered in the UI as an expandable tool trace card.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolCallPayload {
    private String toolName;
    private Map<String, Object> args;
    /** RUNNING | SUCCESS | FAILED */
    private String status;
    /** Non-null when status = TOOL_RESULT */
    private String resultSummary;
}
