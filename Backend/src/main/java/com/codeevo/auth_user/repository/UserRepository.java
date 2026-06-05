package com.codeevo.auth_user.repository;

import com.codeevo.auth_user.domain.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String>, UserRepositoryCustom{
    Optional<User> findByEmail(String Email);

    @Query("{'refreshTokens.tokenHash': ?0}")
    Optional<User> findByRefreshTokensTokenHash(String tokenHash);
}
