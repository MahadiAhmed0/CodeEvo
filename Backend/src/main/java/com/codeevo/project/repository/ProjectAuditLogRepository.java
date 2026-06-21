package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectAuditLogRepository extends MongoRepository<ProjectAuditLog, String> {
    List<ProjectAuditLog> findByProjectIdOrderByOccurredAtDesc(String projectId);
    List<ProjectAuditLog> findByUserIdOrderByOccurredAtDesc(String userId);
}
