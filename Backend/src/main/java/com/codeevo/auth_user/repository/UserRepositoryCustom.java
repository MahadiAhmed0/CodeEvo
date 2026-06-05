package com.codeevo.auth_user.repository;

import com.codeevo.auth_user.domain.RefreshToken;

public interface UserRepositoryCustom {
    void addRefreshToken(String userID, RefreshToken token, int maxDevices);
    void removeRefreshToken(String userID, String tokenHash);
    void rotateRefreshToken(String userID, String oldTokenHash, RefreshToken newToken, int maxDevices);
}
