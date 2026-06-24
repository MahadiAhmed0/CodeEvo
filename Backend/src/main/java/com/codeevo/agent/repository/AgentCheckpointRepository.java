package com.codeevo.agent.repository;

import com.codeevo.agent.document.AgentCheckpoint;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AgentCheckpointRepository extends MongoRepository<AgentCheckpoint, String> {
    Optional<AgentCheckpoint> findTopBySessionIdOrderBySavedAtDesc(String sessionId);
    void deleteBySessionId(String sessionId);
}
