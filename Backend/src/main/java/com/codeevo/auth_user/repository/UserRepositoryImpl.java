package com.codeevo.auth_user.repository;

import com.codeevo.auth_user.domain.RefreshToken;
import com.codeevo.auth_user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    @Override
    public void addRefreshToken(String userID, RefreshToken token, int maxDevices) {
        Query query = new Query(Criteria.where("_id").is(userID));
        Update update = new Update().push("refreshTokens").slice(-maxDevices).each(token);
        mongoTemplate.updateFirst(query, update, User.class);
    }

    @Override
    public void removeRefreshToken(String userID, String tokenHash) {
        Query query = new Query(Criteria.where("_id").is(userID));
        // Use $pull to remove the specific token object from the array
        Update update = new Update().pull("refreshTokens", new org.bson.Document("tokenHash", tokenHash));
        mongoTemplate.updateFirst(query, update, User.class);
    }

    @Override
    public void rotateRefreshToken(String userID, String oldTokenHash, RefreshToken newToken, int maxDevices) {
        removeRefreshToken(userID, oldTokenHash);
        addRefreshToken(userID, newToken, maxDevices);
    }
}
