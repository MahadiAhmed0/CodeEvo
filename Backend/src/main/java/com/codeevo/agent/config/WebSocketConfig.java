package com.codeevo.agent.config;

import com.codeevo.auth_user.security.JwtHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP WebSocket broker configuration.
 *
 * Uses session-scoped /topic/ destinations (no Principal required):
 *   /topic/session/{sessionId}/events  → all agent events (thoughts, progress, messages)
 *   /topic/session/{sessionId}/diffs   → file diff payloads
 *   /topic/session/{sessionId}/graph   → ReactFlow node/edge JSON
 *
 *   /app/user-input      → client → server (user messages)
 *   /app/agent-feedback  → client → server (approve/reject)
 *
 * NOTE: /user/queue routing was removed because it requires a Spring Principal.
 * Anonymous sessions have no principal, making convertAndSendToUser a silent no-op.
 */
@Configuration
@EnableAsync
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${codeevo.websocket.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    public WebSocketConfig(JwtHandshakeInterceptor jwtHandshakeInterceptor) {
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",");
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .addInterceptors(jwtHandshakeInterceptor)
                .withSockJS();
    }
}
