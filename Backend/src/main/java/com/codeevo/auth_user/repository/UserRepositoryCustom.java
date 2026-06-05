package com.codeevo.auth_user.repository;

import com.codeevo.auth_user.domain.RefreshToken;

public interface UserRepositoryCustom {
    void addRefreshToken(String UserID, RefreshToken token, int maxDevices);
    void removeRefreshToken(String UserID, String tokenHash);
    void rotateRefreshToken(String UserID, String oldTokenHash, RefreshToken newToken, int maxDevices);
}
