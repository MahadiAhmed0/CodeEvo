package com.codeevo.agent.repository;

import com.codeevo.agent.document.AgentAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AgentAuditLogRepository extends MongoRepository<AgentAuditLog, String> {
    List<AgentAuditLog> findBySessionIdOrderByTimestampDesc(String sessionId);
    List<AgentAuditLog> findByProjectIdOrderByTimestampDesc(String projectId);
}
