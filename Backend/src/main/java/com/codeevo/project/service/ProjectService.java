package com.codeevo.project.service;

import com.codeevo.project.dto.request.CreateProjectRequest;
import com.codeevo.project.dto.request.SaveDiagramRequest;
import com.codeevo.project.dto.request.UpdateProjectRequest;
import com.codeevo.project.dto.response.*;
import com.codeevo.project.entity.Project;
import com.codeevo.project.entity.ProjectHistory;
import com.codeevo.project.exception.DiagramPayloadTooLargeException;
import com.codeevo.project.exception.ProjectNotFoundException;
import com.codeevo.project.repository.ProjectCodeRepository;
import com.codeevo.project.repository.ProjectHistoryRepository;
import com.codeevo.project.repository.ProjectRepository;
import com.codeevo.project.repository.ProjectSettingsRepository;
import com.codeevo.project.security.ProjectOwnershipValidator;
import com.codeevo.project.util.DiagramJsonValidator;
import com.codeevo.project.util.SanitizerUtil;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectHistoryRepository historyRepository;
    private final ProjectSettingsRepository settingsRepository;
    private final ProjectCodeRepository codeRepository;
    private final ProjectSettingsService settingsService;
    private final ProjectHistoryService historyService;
    private final ProjectAuditService auditService;
    private final DiagramDiffService diffService;
    private final DiagramJsonValidator jsonValidator;
    private final SanitizerUtil sanitizer;
    private final ProjectOwnershipValidator ownershipValidator;

    @Value("${codeevo.project.diagram-max-size-bytes:5242880}")
    private long maxDiagramSizeBytes;

    @Transactional
    public ProjectDetailDto createProject(CreateProjectRequest request, String userId, String idempotencyKey, String ipAddress, String userAgent) {
        if (idempotencyKey != null) {
            Optional<Project> existing = projectRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapToDetailDto(existing.get());
            }
        }

        Project project = Project.builder()
                .ownerId(userId)
                .name(sanitizer.sanitize(request.getName()))
                .description(sanitizer.sanitize(request.getDescription()))
                .status(request.getStatus() != null ? request.getStatus() : "active")
                .diagramJson("{\"nodes\":[],\"edges\":[]}")
                .idempotencyKey(idempotencyKey)
                .build();

        project = projectRepository.save(project);
        settingsService.initializeSettings(project.getId());
        auditService.log(userId, project.getId(), "CREATE", null, ipAddress, userAgent);

        return mapToDetailDto(project);
    }

    public PagedResponse<ProjectSummaryDto> getProjects(String userId, String status, String search, Pageable pageable) {
        Page<Project> page;
        // Always exclude soft-deleted projects; filter by explicit status if provided
        String effectiveStatus = (status != null && !status.isBlank()) ? status : null;
        if (search != null && !search.isBlank()) {
            if (effectiveStatus != null) {
                page = projectRepository.findByOwnerIdAndStatusAndNameContainingIgnoreCase(userId, effectiveStatus, search, pageable);
            } else {
                page = projectRepository.findByOwnerIdAndStatusNotAndNameContainingIgnoreCase(userId, "deleted", search, pageable);
            }
        } else {
            if (effectiveStatus != null) {
                page = projectRepository.findByOwnerIdAndStatus(userId, effectiveStatus, pageable);
            } else {
                page = projectRepository.findByOwnerIdAndStatusNot(userId, "deleted", pageable);
            }
        }

        return PagedResponse.<ProjectSummaryDto>builder()
                .content(page.getContent().stream().map(this::mapToSummaryDto).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    public List<ProjectSummaryDto> getRecentProjects(String userId) {
        Pageable topThree = PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return projectRepository.findByOwnerIdAndStatusNot(userId, "deleted", topThree)
                .getContent().stream().map(this::mapToSummaryDto).collect(Collectors.toList());
    }

    public DashboardStatsDto getDashboardStats(String userId) {
        // Exclude soft-deleted projects from all stats
        long total = projectRepository.countByOwnerIdAndStatusNot(userId, "deleted");
        long active = projectRepository.countByOwnerIdAndStatus(userId, "active");
        long inactive = projectRepository.countByOwnerIdAndStatus(userId, "inactive");

        long totalServices = projectRepository.findByOwnerIdAndStatusNot(userId, "deleted", Pageable.unpaged())
                .getContent().stream()
                .mapToLong(Project::getServiceCount)
                .sum();

        return DashboardStatsDto.builder()
                .totalProjects(total)
                .activeProjects(active)
                .inactiveProjects(inactive)
                .totalServiceNodes(totalServices)
                .build();
    }

    public ProjectDetailDto getProject(String projectId, String userId, String ipAddress, String userAgent) {
        Project project = ownershipValidator.getAndValidateOwnership(projectId, userId, "READ", ipAddress, userAgent);
        return mapToDetailDto(project);
    }

    @Transactional
    public ProjectDetailDto updateProject(String projectId, String userId, UpdateProjectRequest request, String ipAddress, String userAgent) {
        Project project = ownershipValidator.getAndValidateOwnership(projectId, userId, "UPDATE", ipAddress, userAgent);

        boolean updated = false;
        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(sanitizer.sanitize(request.getName()));
            updated = true;
        }
        if (request.getDescription() != null) {
            project.setDescription(sanitizer.sanitize(request.getDescription()));
            updated = true;
        }
        if (request.getStatus() != null && (request.getStatus().equals("active") || request.getStatus().equals("inactive"))) {
            project.setStatus(request.getStatus());
            updated = true;
        }

        if (updated) {
            project.setUpdatedAt(Instant.now());
            project = projectRepository.save(project);
            auditService.log(userId, projectId, "UPDATE", "Metadata updated", ipAddress, userAgent);
        }

        return mapToDetailDto(project);
    }

    @Transactional
    public SaveDiagramResponseDto saveDiagram(String projectId, String userId, SaveDiagramRequest request, String ipAddress, String userAgent) {
        Project project = ownershipValidator.getAndValidateOwnership(projectId, userId, "UPDATE_DIAGRAM", ipAddress, userAgent);

        String rawJson = request.getDiagramJson();
        if (rawJson != null && rawJson.getBytes().length > maxDiagramSizeBytes) {
            throw new DiagramPayloadTooLargeException("Diagram payload exceeds " + maxDiagramSizeBytes + " bytes");
        }

        JsonNode rootNode = jsonValidator.parseAndValidate(rawJson);
        int serviceCount = jsonValidator.countServiceNodes(rootNode);

        DiagramDiffService.DiffResult diff = diffService.computeDiff(project.getDiagramJson(), rawJson);
        
        String changeMessage = request.getChangeMessage();
        if (changeMessage == null || changeMessage.isBlank()) {
            changeMessage = diff.message;
        } else {
            changeMessage = sanitizer.sanitize(changeMessage);
        }

        ProjectHistory snapshot = historyService.createSnapshot(
                projectId, userId, rawJson, diff.nodeDelta, diff.edgeDelta, changeMessage
        );

        project.setDiagramJson(rawJson);
        project.setDiagramVersion(project.getDiagramVersion() + 1);
        project.setServiceCount(serviceCount);
        project.setUpdatedAt(Instant.now());
        project = projectRepository.save(project);

        auditService.log(userId, projectId, "UPDATE_DIAGRAM", "Version: " + project.getDiagramVersion(), ipAddress, userAgent);

        return SaveDiagramResponseDto.builder()
                .diagramVersion(project.getDiagramVersion())
                .serviceCount(project.getServiceCount())
                .updatedAt(project.getUpdatedAt())
                .historyEntryId(snapshot.getId())
                .build();
    }

    @Transactional
    public void deleteProject(String projectId, String userId, boolean hard, String ipAddress, String userAgent) {
        Project project = ownershipValidator.getAndValidateOwnership(projectId, userId, "DELETE", ipAddress, userAgent);

        if (hard) {
            // Audit BEFORE deleting so the log entry has context
            auditService.log(userId, projectId, "HARD_DELETE", null, ipAddress, userAgent);
            historyRepository.deleteByProjectId(projectId);
            settingsRepository.deleteByProjectId(projectId);
            codeRepository.deleteByProjectId(projectId);
            projectRepository.delete(project);
        } else {
            project.setStatus("deleted");
            project.setUpdatedAt(Instant.now());
            projectRepository.save(project);
            auditService.log(userId, projectId, "SOFT_DELETE", null, ipAddress, userAgent);
        }
    }

    @Transactional
    public SaveDiagramResponseDto restoreDiagram(String projectId, String historyId, String userId, String ipAddress, String userAgent) {
        Project project = ownershipValidator.getAndValidateOwnership(projectId, userId, "RESTORE", ipAddress, userAgent);
        
        ProjectHistory historyEntry = historyRepository.findById(historyId)
                .orElseThrow(() -> new ProjectNotFoundException("History entry not found"));
                
        if (!historyEntry.getProjectId().equals(projectId)) {
            throw new ProjectNotFoundException("History entry not found for this project");
        }

        String restoredJson = historyEntry.getDiagramJson();
        JsonNode rootNode = jsonValidator.parseAndValidate(restoredJson);
        int serviceCount = jsonValidator.countServiceNodes(rootNode);

        String message = "Restored to snapshot " + historyEntry.getCommitHash();
        
        ProjectHistory snapshot = historyService.createSnapshot(
                projectId, userId, restoredJson, 0, 0, message
        );

        project.setDiagramJson(restoredJson);
        project.setDiagramVersion(project.getDiagramVersion() + 1);
        project.setServiceCount(serviceCount);
        project.setUpdatedAt(Instant.now());
        project = projectRepository.save(project);

        auditService.log(userId, projectId, "RESTORE", "Restored to " + historyEntry.getCommitHash(), ipAddress, userAgent);

        return SaveDiagramResponseDto.builder()
                .diagramVersion(project.getDiagramVersion())
                .serviceCount(project.getServiceCount())
                .updatedAt(project.getUpdatedAt())
                .historyEntryId(snapshot.getId())
                .build();
    }

    private ProjectSummaryDto mapToSummaryDto(Project project) {
        return ProjectSummaryDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .serviceCount(project.getServiceCount())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private ProjectDetailDto mapToDetailDto(Project project) {
        return ProjectDetailDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .serviceCount(project.getServiceCount())
                .diagramJson(project.getDiagramJson())
                .diagramVersion(project.getDiagramVersion())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
