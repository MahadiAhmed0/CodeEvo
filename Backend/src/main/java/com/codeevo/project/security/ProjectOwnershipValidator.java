package com.codeevo.project.security;

import com.codeevo.project.entity.Project;
import com.codeevo.project.exception.ProjectAccessDeniedException;
import com.codeevo.project.exception.ProjectNotFoundException;
import com.codeevo.project.repository.ProjectRepository;
import com.codeevo.project.service.ProjectAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectOwnershipValidator {

    private final ProjectRepository projectRepository;
    private final ProjectAuditService auditService;

    public Project getAndValidateOwnership(String projectId, String userId, String action, String ipAddress, String userAgent) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        if (!project.getOwnerId().equals(userId)) {
            // Log unauthorized access attempt
            auditService.log(userId, projectId, "UNAUTHORIZED_ACCESS_" + action, null, ipAddress, userAgent);
            // Throw NotFound instead of AccessDenied to prevent resource enumeration if requested
            // The requirement says: "Return 404 (not 403) when a resource exists but the requesting user is not the owner — to prevent resource enumeration attacks."
            throw new ProjectNotFoundException(projectId);
        }

        return project;
    }
}
