package com.codeevo.project.controller;

import com.codeevo.project.dto.response.PagedResponse;
import com.codeevo.project.dto.response.ProjectHistoryEntryDto;
import com.codeevo.project.dto.response.SaveDiagramResponseDto;
import com.codeevo.project.service.ProjectHistoryService;
import com.codeevo.project.service.ProjectService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/history")
@RequiredArgsConstructor
public class ProjectHistoryController {

    private final ProjectHistoryService historyService;
    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<PagedResponse<ProjectHistoryEntryDto>> getHistory(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        // Validate ownership first
        projectService.getProject(projectId, userId, ipAddress, userAgent);

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        var pageResult = historyService.getProjectHistory(projectId, pageable);
        
        PagedResponse<ProjectHistoryEntryDto> response = PagedResponse.<ProjectHistoryEntryDto>builder()
                .content(pageResult.getContent())
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .build();
                
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{historyId}")
    public ResponseEntity<ProjectHistoryEntryDto> getHistoryEntry(
            @PathVariable String projectId,
            @PathVariable String historyId,
            Authentication authentication,
            HttpServletRequest servletRequest) {
            
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        // Validate ownership first
        projectService.getProject(projectId, userId, ipAddress, userAgent);

        return ResponseEntity.ok(historyService.getHistoryEntry(historyId));
    }

    @PostMapping("/{historyId}/restore")
    public ResponseEntity<SaveDiagramResponseDto> restoreHistory(
            @PathVariable String projectId,
            @PathVariable String historyId,
            Authentication authentication,
            HttpServletRequest servletRequest) {
            
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(projectService.restoreDiagram(projectId, historyId, userId, ipAddress, userAgent));
    }

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = "";
        if (request != null) {
            remoteAddr = request.getHeader("X-FORWARDED-FOR");
            if (remoteAddr == null || "".equals(remoteAddr)) {
                remoteAddr = request.getRemoteAddr();
            }
        }
        return remoteAddr;
    }
}
