package com.codeevo.agent.gateway;

import com.codeevo.agent.model.AgentEvent;
import com.codeevo.agent.model.AgentEventType;
import com.codeevo.agent.model.payload.DiffReadyPayload;
import com.codeevo.agent.model.payload.GraphUpdatePayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedList;
import java.util.concurrent.ConcurrentHashMap;

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
     * Generic session-level dedup: tracks the last N event payload signatures
     * per sessionId, regardless of source agent or event type. Suppresses any
     * event whose payload exactly matches a recent event from any agent.
     * This stops all spam (progress, checkpoint, tool calls, etc.) at the source.
     */
    private static final int MAX_RECENT_SIGNATURES = 5;
    private final ConcurrentHashMap<String, LinkedList<String>> recentEventSignatures = new ConcurrentHashMap<>();

    public void emit(String userId, AgentEvent event) {
        try {
            if (isDuplicate(event)) return;

            String dest = "/topic/session/" + event.getSessionId() + "/events";
            messagingTemplate.convertAndSend(dest, event);
            log.debug("Emitted [{}] {} to {}", event.getAgentType(), event.getType(), dest);
        } catch (Exception e) {
            log.error("Failed to emit event to session {}: {}", event.getSessionId(), e.getMessage());
        }
    }

    /**
     * Returns true if this event's payload matches any of the last N events
     * in this session, regardless of which agent or event type produced them.
     * This is a generic "recent messages identical → skip" filter.
     */
    private boolean isDuplicate(AgentEvent event) {
        String signature = event.getType() + "|" + (event.getPayload() != null ? event.getPayload().toString() : "");
        LinkedList<String> recent = recentEventSignatures.computeIfAbsent(event.getSessionId(), k -> new LinkedList<>());
        synchronized (recent) {
            if (recent.contains(signature)) {
                return true;
            }
            recent.addLast(signature);
            while (recent.size() > MAX_RECENT_SIGNATURES) {
                recent.removeFirst();
            }
        }
        return false;
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
     * Emit a raw string log line to the Docker logs topic for a project sandbox.
     */
    public void emitDockerLog(String projectId, String logLine) {
        try {
            String dest = "/topic/project/" + projectId + "/docker-logs";
            messagingTemplate.convertAndSend(dest, logLine);
        } catch (Exception e) {
            log.error("Failed to emit docker log to project {}: {}", projectId, e.getMessage());
        }
    }

    /**
     * @deprecated Use emit() instead — errors are now sent to the same events topic.
     */
    public void emitError(String userId, AgentEvent event) {
        emit(userId, event);
    }
}
