package com.codeevo.auth_user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private long expiresIn;
    private UserDto user;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String refreshToken;
}
