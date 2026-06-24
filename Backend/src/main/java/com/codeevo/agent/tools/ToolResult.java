package com.codeevo.agent.tools;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wrapper around the result of any tool invocation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolResult {
    private boolean success;
    private String content;
    private String errorMessage;

    public static ToolResult ok(String content) {
        return ToolResult.builder().success(true).content(content).build();
    }

    public static ToolResult error(String message) {
        return ToolResult.builder().success(false).errorMessage(message)
                .content("ERROR: " + message).build();
    }

    /** Returns content for success, or "ERROR: ..." for failures */
    public String toToolMessageContent() {
        return success ? content : "ERROR: " + errorMessage;
    }
}
