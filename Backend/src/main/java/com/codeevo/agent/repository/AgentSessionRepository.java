package com.codeevo.agent.repository;

import com.codeevo.agent.document.AgentSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AgentSessionRepository extends MongoRepository<AgentSession, String> {
    Optional<AgentSession> findByUserIdAndProjectIdAndActiveTrue(String userId, String projectId);
}
