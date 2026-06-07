package com.codeevo.auth_user.service;


import com.codeevo.auth_user.domain.User;
import com.codeevo.auth_user.dto.AuthResponse;
import com.codeevo.auth_user.dto.LoginRequest;
import com.codeevo.auth_user.dto.RegisterRequest;
import com.codeevo.auth_user.dto.UserDto;
import com.codeevo.auth_user.exception.InvalidTokenException;
import com.codeevo.auth_user.exception.UserAlreadyExistsException;
import com.codeevo.auth_user.repository.UserRepository;
import com.codeevo.auth_user.security.JwtTokenProvider;
import com.codeevo.auth_user.publisher.UserEventPublisher;
import com.codeevo.auth_user.domain.RefreshToken;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;


@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final UserEventPublisher userEventPublisher;

    private static final int MAX_DEVICES = 5;

    public AuthResponse registerLocalUser(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("Email already exists");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .provider("local")
                .createdAt(Instant.now())
                .lastLoginAt(Instant.now())
                .refreshTokens(new ArrayList<>())
                .build();

        user = userRepository.save(user);

        // Emit Event
        userEventPublisher.publishUserRegisteredEvent(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());

        return processUserAndTokens(user);
    }

    public AuthResponse loginLocalUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        user.setLastLoginAt(Instant.now());
        user = userRepository.save(user);

        return processUserAndTokens(user);
    }

    private AuthResponse processUserAndTokens(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String plainRefreshToken = tokenProvider.generateRefreshToken();
        String hashedRefreshToken = hashToken(plainRefreshToken);

        RefreshToken newToken = RefreshToken.builder()
                .tokenHash(hashedRefreshToken)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshExpirationInMs()))
                .build();

        // Atomically add token and slice to MAX_DEVICES
        userRepository.addRefreshToken(user.getId(), newToken, MAX_DEVICES);

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .expiresIn(tokenProvider.getJwtExpirationInMs())
                .refreshToken(plainRefreshToken)
                .user(userDto)
                .build();
    }

    public AuthResponse refreshToken(String token) {
        String hashedToken = hashToken(token);

        // This is a naive search. Since refreshTokens is now a list of objects, MongoRepository findByRefreshTokens might not work perfectly with a String argument.
        // We will need to update UserRepository to findByRefreshTokensTokenHash(String hash), or do a manual search.
        // For now, let's fix the logic assuming UserRepository handles it.
        User user = userRepository.findByRefreshTokensTokenHash(hashedToken)
                .orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));

        // Validate expiry
        RefreshToken matchedToken = user.getRefreshTokens().stream()
                .filter(rt -> rt.getTokenHash().equals(hashedToken))
                .findFirst()
                .orElseThrow(() -> new InvalidTokenException("Invalid refresh token"));

        if (matchedToken.isExpired()) {
            userRepository.removeRefreshToken(user.getId(), matchedToken.getTokenHash());
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Generate new tokens
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String plainNewRefreshToken = tokenProvider.generateRefreshToken();
        String hashedNewRefreshToken = hashToken(plainNewRefreshToken);

        RefreshToken newToken = RefreshToken.builder()
                .tokenHash(hashedNewRefreshToken)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusMillis(tokenProvider.getRefreshExpirationInMs()))
                .build();

        // Atomically rotate token
        userRepository.rotateRefreshToken(user.getId(), matchedToken.getTokenHash(), newToken, MAX_DEVICES);

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .expiresIn(tokenProvider.getJwtExpirationInMs())
                .refreshToken(plainNewRefreshToken)
                .user(userDto)
                .build();
    }

    public void logout(String refreshToken) {
        String hashedToken = hashToken(refreshToken);
        userRepository.findByRefreshTokensTokenHash(hashedToken).ifPresent(user -> {
            userRepository.removeRefreshToken(user.getId(), hashedToken);
        });
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}
