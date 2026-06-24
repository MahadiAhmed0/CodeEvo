package com.codeevo.agent.gateway;

import com.codeevo.auth_user.security.JwtHandshakeInterceptor;
import com.codeevo.agent.model.UserFeedback;
import com.codeevo.agent.supervisor.SupervisorService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * Handles all inbound STOMP messages from the frontend.
 *
 * Client sends to:
 *   /app/user-input     → new user message (text prompt)
 *   /app/agent-feedback → approve/reject/modify decision
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AgentInputController {

    private final SupervisorService supervisorService;

    /**
     * Receives a new user text message and hands it to the Supervisor for routing.
     * userId is resolved from the WebSocket session attributes populated by JwtHandshakeInterceptor.
     */
    @MessageMapping("/user-input")
    public void handleUserInput(@Payload UserInputMessage input,
                                SimpMessageHeaderAccessor headerAccessor,
                                Principal principal) {
        String userId = resolveUserId(headerAccessor, principal);
        log.info("Received user-input from {}: session={}", userId, input.getSessionId());
        supervisorService.handleUserMessage(userId, input.getSessionId(), input.getProjectId(), input.getMessage());
    }

    /**
     * Receives user approve/reject/modify feedback for a pending permission request.
     */
    @MessageMapping("/agent-feedback")
    public void handleFeedback(@Payload UserFeedback feedback,
                               SimpMessageHeaderAccessor headerAccessor,
                               Principal principal) {
        String userId = resolveUserId(headerAccessor, principal);
        log.info("Received agent-feedback from {}: token={}, decision={}",
                userId, feedback.getApprovalToken(), feedback.getDecision());
        supervisorService.handleUserFeedback(userId, feedback);
    }

    /**
     * Resolves the authenticated user ID from session attributes (set by JwtHandshakeInterceptor),
     * falling back to the STOMP Principal, and finally to "anonymous" for dev mode.
     */
    private String resolveUserId(SimpMessageHeaderAccessor headerAccessor, Principal principal) {
        // Primary: read from session attributes set by JwtHandshakeInterceptor
        Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null) {
            Object uid = sessionAttrs.get(JwtHandshakeInterceptor.USER_ID_ATTR);
            if (uid instanceof String s && !s.isBlank()) return s;
        }
        // Fallback: STOMP principal (e.g. from Spring Security integration)
        if (principal != null && principal.getName() != null) return principal.getName();
        return "anonymous";
    }

    // ─── Input DTOs ──────────────────────────────────────────────────────────

    @Data
    public static class UserInputMessage {
        private String sessionId;
        private String projectId;
        private String message;
    }
}
