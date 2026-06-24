package com.codeevo.agent.llm;

import java.util.List;
import java.util.Map;

/**
 * Provider-agnostic LLM client interface.
 *
 * All concrete implementations (Groq, Gemini via OpenAI-compat, OpenRouter, etc.)
 * implement this single interface. Agents interact only with this interface —
 * the underlying provider is invisible to agent logic.
 */
public interface LlmClient {

    /**
     * Send a conversation context to the LLM and receive a response.
     *
     * @param messages  Ordered conversation history (system + user + assistant turns)
     * @param tools     Tool definitions available to the LLM (null or empty = no tools)
     * @return          Parsed response containing stop reason, text, and/or tool calls
     */
    LlmResponse chat(List<LlmMessage> messages, List<Map<String, Object>> tools);

    /**
     * Simplified call without tool support (for summarization, simple queries).
     */
    default LlmResponse chat(List<LlmMessage> messages) {
        return chat(messages, null);
    }
}
