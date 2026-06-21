package com.codeevo.project.service;

import com.codeevo.project.dto.response.ProjectHistoryEntryDto;
import com.codeevo.project.entity.ProjectHistory;
import com.codeevo.project.exception.ProjectNotFoundException;
import com.codeevo.project.repository.ProjectHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectHistoryService {

    private final ProjectHistoryRepository historyRepository;

    @Transactional
    public ProjectHistory createSnapshot(String projectId, String userId, String diagramJson, 
                                         int nodeDelta, int edgeDelta, String customMessage) {
        
        String commitHash = UUID.randomUUID().toString().substring(0, 7);
        
        ProjectHistory history = ProjectHistory.builder()
                .projectId(projectId)
                .diagramJson(diagramJson)
                .message(customMessage)
                .commitHash(commitHash)
                .nodeDelta(nodeDelta)
                .edgeDelta(edgeDelta)
                .createdAt(Instant.now())
                .createdBy(userId)
                .build();
                
        return historyRepository.save(history);
    }

    public Page<ProjectHistoryEntryDto> getProjectHistory(String projectId, Pageable pageable) {
        return historyRepository.findByProjectId(projectId, pageable)
                .map(this::mapToEntryDto);
    }

    public ProjectHistoryEntryDto getHistoryEntry(String historyId) {
        ProjectHistory history = historyRepository.findById(historyId)
                .orElseThrow(() -> new ProjectNotFoundException("History entry not found"));
        
        ProjectHistoryEntryDto dto = mapToEntryDto(history);
        dto.setDiagramJson(history.getDiagramJson()); // Include diagram json for detail view
        return dto;
    }

    private ProjectHistoryEntryDto mapToEntryDto(ProjectHistory history) {
        return ProjectHistoryEntryDto.builder()
                .id(history.getId())
                .message(history.getMessage())
                .commitHash(history.getCommitHash())
                .nodeDelta(history.getNodeDelta())
                .edgeDelta(history.getEdgeDelta())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
