package com.codeevo.project.service;

import com.codeevo.project.entity.ProjectAuditLog;
import com.codeevo.project.repository.ProjectAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectAuditService {

    private final ProjectAuditLogRepository auditLogRepository;

    public void log(String userId, String projectId, String action, String detail, String ipAddress, String userAgent) {
        try {
            ProjectAuditLog auditLog = ProjectAuditLog.builder()
                    .userId(userId)
                    .projectId(projectId)
                    .action(action)
                    .detail(detail)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // Do not break the main transaction if audit fails, but log it
            log.error("Failed to write audit log: action={}, userId={}, projectId={}", action, userId, projectId, e);
        }
    }
}
