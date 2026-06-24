package com.codeevo.auth_user.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Validates the JWT token during the WebSocket (SockJS) handshake.
 *
 * The JWT can be sent in two ways:
 *   1. As a query param:  /ws?token=<jwt>           (recommended for SockJS)
 *   2. As a header:       Authorization: Bearer <jwt>
 *
 * If validation succeeds, the userId is stored in the WebSocket session attributes
 * so it can be retrieved by AgentInputController without falling back to "anonymous".
 *
 * If validation fails, the handshake is rejected with HTTP 401.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider tokenProvider;

    public static final String USER_ID_ATTR = "userId";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {

        String token = extractToken(request);

        if (!StringUtils.hasText(token) || !tokenProvider.validateToken(token)) {
            log.warn("WebSocket handshake rejected — missing or invalid JWT");
            response.setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return false; // Reject connection
        }

        String userId = tokenProvider.getUserIdFromJWT(token);
        attributes.put(USER_ID_ATTR, userId);
        log.info("WebSocket handshake accepted for userId={}", userId);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // No-op
    }

    private String extractToken(ServerHttpRequest request) {
        // 1. Try query param ?token=...  (SockJS uses query params since it can't set custom headers)
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String tokenParam = servletRequest.getServletRequest().getParameter("token");
            if (StringUtils.hasText(tokenParam)) return tokenParam;
        }

        // 2. Fall back to Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        return null;
    }
}
