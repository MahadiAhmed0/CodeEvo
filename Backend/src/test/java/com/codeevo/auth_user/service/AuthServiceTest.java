package com.codeevo.auth_user.service;

import com.codeevo.auth_user.domain.RefreshToken;
import com.codeevo.auth_user.domain.User;
import com.codeevo.auth_user.dto.LoginRequest;
import com.codeevo.auth_user.dto.RegisterRequest;
import com.codeevo.auth_user.exception.InvalidTokenException;
import com.codeevo.auth_user.exception.UserAlreadyExistsException;
import com.codeevo.auth_user.publisher.UserEventPublisher;
import com.codeevo.auth_user.repository.UserRepository;
import com.codeevo.auth_user.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private UserEventPublisher eventPublisher;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        authService = new AuthService(userRepository, passwordEncoder, tokenProvider, eventPublisher);
    }

    @Test
    void registerLocalUser_shouldEncodePasswordWithArgon2() {
        RegisterRequest request = RegisterRequest.builder()
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .password("TestPass1!")
                .build();

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());
        when(tokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken()).thenReturn("refresh-token");
        when(tokenProvider.getJwtExpirationInMs()).thenReturn(1800000L);
        when(tokenProvider.getRefreshExpirationInMs()).thenReturn(604800000L);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId("user-123");
            return u;
        });
        doNothing().when(userRepository).addRefreshToken(anyString(), any(RefreshToken.class), anyInt());

        authService.registerLocalUser(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertNotNull(savedUser.getPassword());
        assertTrue(passwordEncoder.matches("TestPass1!", savedUser.getPassword()),
                "Password should be Argon2-hashed, not stored in plaintext");

        verify(eventPublisher).publishUserRegisteredEvent("user-123", "john@example.com", "John", "Doe");
    }

    @Test
    void registerLocalUser_duplicateEmail_shouldThrow() {
        RegisterRequest request = RegisterRequest.builder()
                .email("existing@example.com")
                .password("TestPass1!")
                .firstName("Jane")
                .lastName("Doe")
                .build();

        when(userRepository.findByEmail("existing@example.com"))
                .thenReturn(Optional.of(new User()));

        assertThrows(UserAlreadyExistsException.class, () -> authService.registerLocalUser(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void loginLocalUser_correctPassword_shouldSucceed() {
        String rawPassword = "TestPass1!";
        String hashedPassword = passwordEncoder.encode(rawPassword);

        User user = User.builder()
                .id("user-123")
                .email("john@example.com")
                .password(hashedPassword)
                .provider("local")
                .createdAt(Instant.now())
                .lastLoginAt(Instant.now())
                .refreshTokens(new ArrayList<>())
                .build();

        LoginRequest request = new LoginRequest("john@example.com", rawPassword);

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(tokenProvider.generateAccessToken("user-123", "john@example.com")).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken()).thenReturn("refresh-token");
        when(tokenProvider.getJwtExpirationInMs()).thenReturn(1800000L);
        when(tokenProvider.getRefreshExpirationInMs()).thenReturn(604800000L);
        when(userRepository.save(any(User.class))).thenReturn(user);
        doNothing().when(userRepository).addRefreshToken(anyString(), any(RefreshToken.class), anyInt());

        var response = authService.loginLocalUser(request);

        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("john@example.com", response.getUser().getEmail());
    }

    @Test
    void loginLocalUser_wrongPassword_shouldThrow() {
        String hashedPassword = passwordEncoder.encode("CorrectPass1!");

        User user = User.builder()
                .id("user-123")
                .email("john@example.com")
                .password(hashedPassword)
                .provider("local")
                .build();

        LoginRequest request = new LoginRequest("john@example.com", "WrongPass1!");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        assertThrows(BadCredentialsException.class, () -> authService.loginLocalUser(request));
    }

    @Test
    void loginLocalUser_nonexistentEmail_shouldThrow() {
        LoginRequest request = new LoginRequest("nobody@example.com", "SomePass1!");

        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.loginLocalUser(request));
    }

    @Test
    void refreshToken_validToken_shouldRotate() {
        String refreshToken = "valid-refresh-token";

        RefreshToken existingToken = RefreshToken.builder()
                .tokenHash(hashToken(refreshToken))
                .createdAt(Instant.now().minusSeconds(3600))
                .expiresAt(Instant.now().plusSeconds(604800))
                .build();

        User user = User.builder()
                .id("user-123")
                .email("john@example.com")
                .refreshTokens(new ArrayList<>())
                .build();
        user.getRefreshTokens().add(existingToken);

        when(userRepository.findByRefreshTokensTokenHash(hashToken(refreshToken)))
                .thenReturn(Optional.of(user));
        when(tokenProvider.generateAccessToken("user-123", "john@example.com")).thenReturn("new-access-token");
        when(tokenProvider.generateRefreshToken()).thenReturn("new-refresh-token");
        when(tokenProvider.getJwtExpirationInMs()).thenReturn(1800000L);
        when(tokenProvider.getRefreshExpirationInMs()).thenReturn(604800000L);
        doNothing().when(userRepository).rotateRefreshToken(anyString(), anyString(), any(RefreshToken.class), anyInt());

        var response = authService.refreshToken(refreshToken);

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        verify(userRepository).rotateRefreshToken(eq("user-123"), eq(hashToken(refreshToken)), any(RefreshToken.class), eq(5));
    }

    @Test
    void refreshToken_expiredToken_shouldThrow() {
        String refreshToken = "expired-refresh-token";

        RefreshToken expiredToken = RefreshToken.builder()
                .tokenHash(hashToken(refreshToken))
                .createdAt(Instant.now().minusSeconds(604800 * 2))
                .expiresAt(Instant.now().minusSeconds(3600))
                .build();

        User user = User.builder()
                .id("user-123")
                .email("john@example.com")
                .refreshTokens(new ArrayList<>())
                .build();
        user.getRefreshTokens().add(expiredToken);

        when(userRepository.findByRefreshTokensTokenHash(hashToken(refreshToken)))
                .thenReturn(Optional.of(user));

        assertThrows(InvalidTokenException.class, () -> authService.refreshToken(refreshToken));
        verify(userRepository).removeRefreshToken("user-123", hashToken(refreshToken));
    }

    @Test
    void refreshToken_invalidToken_shouldThrow() {
        when(userRepository.findByRefreshTokensTokenHash(hashToken("invalid")))
                .thenReturn(Optional.empty());

        assertThrows(InvalidTokenException.class, () -> authService.refreshToken("invalid"));
    }

    @Test
    void logout_shouldRemoveToken() {
        String refreshToken = "some-refresh-token";
        String hashed = hashToken(refreshToken);

        User user = User.builder().id("user-123").build();
        when(userRepository.findByRefreshTokensTokenHash(hashed)).thenReturn(Optional.of(user));

        authService.logout(refreshToken);

        verify(userRepository).removeRefreshToken("user-123", hashed);
    }

    @Test
    void logout_unknownToken_shouldDoNothing() {
        when(userRepository.findByRefreshTokensTokenHash(hashToken("unknown")))
                .thenReturn(Optional.empty());

        authService.logout("unknown");

        verify(userRepository, never()).removeRefreshToken(anyString(), anyString());
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
