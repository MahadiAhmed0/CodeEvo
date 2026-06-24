package com.codeevo.agent.gateway;

import com.codeevo.agent.model.AgentEvent;
import com.codeevo.agent.model.payload.DiffReadyPayload;
import com.codeevo.agent.model.payload.GraphUpdatePayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper around {@link SimpMessagingTemplate} that sends typed events
 * to session-scoped STOMP topic destinations.
 *
 * STOMP Destination Map:
 *   /topic/session/{sessionId}/events  → all agent events (thoughts, progress, messages)
 *   /topic/session/{sessionId}/diffs   → file diff payloads (DiffReadyPayload)
 *   /topic/session/{sessionId}/graph   → ReactFlow graph JSON (GraphUpdatePayload)
 *
 * NOTE: We use /topic/ instead of /user/queue/ because anonymous WebSocket sessions
 * have no Spring Principal. convertAndSendToUser("anonymous", ...) is a silent no-op
 * when no session is registered under that principal name.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketGateway {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Emit any agent event to the session's events topic.
     * The sessionId is read from the event itself.
     */
    public void emit(String userId, AgentEvent event) {
        try {
            String dest = "/topic/session/" + event.getSessionId() + "/events";
            messagingTemplate.convertAndSend(dest, event);
            log.debug("Emitted [{}] {} to {}", event.getAgentType(), event.getType(), dest);
        } catch (Exception e) {
            log.error("Failed to emit event to session {}: {}", event.getSessionId(), e.getMessage());
        }
    }

    /**
     * Emit a file diff payload to the session's diffs topic.
     */
    public void emitDiff(String userId, AgentEvent event, DiffReadyPayload diff) {
        try {
            String dest = "/topic/session/" + event.getSessionId() + "/diffs";
            messagingTemplate.convertAndSend(dest, event);
        } catch (Exception e) {
            log.error("Failed to emit diff to session {}: {}", event.getSessionId(), e.getMessage());
        }
    }

    /**
     * Emit a ReactFlow graph update to the session's graph topic.
     */
    public void emitGraph(String userId, AgentEvent event) {
        try {
            String dest = "/topic/session/" + event.getSessionId() + "/graph";
            messagingTemplate.convertAndSend(dest, event);
        } catch (Exception e) {
            log.error("Failed to emit graph to session {}: {}", event.getSessionId(), e.getMessage());
        }
    }

    /**
     * @deprecated Use emit() instead — errors are now sent to the same events topic.
     */
    public void emitError(String userId, AgentEvent event) {
        emit(userId, event);
    }
}
