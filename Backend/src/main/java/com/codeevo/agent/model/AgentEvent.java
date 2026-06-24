package com.codeevo.agent.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Unified server-to-client event envelope.
 * All agent events (thoughts, tool calls, diffs, graph updates, errors)
 * are wrapped in this class and sent over STOMP to:
 *   /user/{userId}/queue/agent-events
 *
 * The {@code payload} field is typed by {@code type}. On the client side,
 * discriminate on {@code type} to cast/render the correct component.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentEvent {

    /** Unique event ID — used for client-side deduplication */
    @Builder.Default
    private String eventId = UUID.randomUUID().toString();

    private String sessionId;
    private String projectId;
    private AgentType agentType;
    private AgentEventType type;

    @Builder.Default
    private String timestamp = Instant.now().toString();

    /** The event-specific payload object. Jackson serializes this polymorphically. */
    private Object payload;

    // ─── Convenience factory methods ─────────────────────────────────────────

    public static AgentEvent thought(String sessionId, String projectId, AgentType agent, String content) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(agent)
                .type(AgentEventType.THOUGHT)
                .payload(new SimplePayload(content))
                .build();
    }

    public static AgentEvent progress(String sessionId, String projectId, AgentType agent, String message, String status) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(agent)
                .type(AgentEventType.PROGRESS)
                .payload(new ProgressPayload(message, status))
                .build();
    }

    public static AgentEvent message(String sessionId, String projectId, AgentType agent, String content) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(agent)
                .type(AgentEventType.MESSAGE)
                .payload(new SimplePayload(content))
                .build();
    }

    public static AgentEvent error(String sessionId, String projectId, AgentType agent, String message, boolean fatal) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(agent)
                .type(fatal ? AgentEventType.FATAL_ERROR : AgentEventType.ERROR)
                .payload(new ErrorPayload(message))
                .build();
    }

    public static AgentEvent taskComplete(String sessionId, String projectId, AgentType agent) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(agent)
                .type(AgentEventType.TASK_COMPLETE)
                .payload(new SimplePayload("Task complete"))
                .build();
    }

    // ─── Simple embedded payload records ─────────────────────────────────────

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class SimplePayload {
        private String content;
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ProgressPayload {
        private String message;
        private String status; // RUNNING | SUCCESS | WARNING | FAILED
    }

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ErrorPayload {
        private String message;
    }
}
