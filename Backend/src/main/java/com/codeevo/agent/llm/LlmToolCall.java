package com.codeevo.agent.llm;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single tool call requested by the LLM.
 * Mirrors the OpenAI tool_call object structure.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmToolCall {
    /** Unique ID for this tool call (returned in tool result messages) */
    private String id;
    private String type; // always "function"
    private String name; // tool/function name
    /** Raw arguments JSON node for flexible parsing */
    private JsonNode arguments;
}
