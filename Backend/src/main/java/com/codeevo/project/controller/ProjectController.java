package com.codeevo.project.controller;

import com.codeevo.project.dto.request.CreateProjectRequest;
import com.codeevo.project.dto.request.SaveDiagramRequest;
import com.codeevo.project.dto.request.UpdateProjectRequest;
import com.codeevo.project.dto.response.DashboardStatsDto;
import com.codeevo.project.dto.response.PagedResponse;
import com.codeevo.project.dto.response.ProjectDetailDto;
import com.codeevo.project.dto.response.ProjectSummaryDto;
import com.codeevo.project.dto.response.SaveDiagramResponseDto;
import com.codeevo.project.service.ProjectService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ProjectDetailDto> createProject(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");
        
        ProjectDetailDto response = projectService.createProject(request, userId, idempotencyKey, ipAddress, userAgent);
        
        // If it was already created (idempotent), ideally return 200, else 201. We return 201 for simplicity or 200 based on diff logic.
        // Returning 200 always is safe if it's idempotent, but standard is 201 for new. We'll stick to 201.
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagedResponse<ProjectSummaryDto>> getProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        
        String userId = (String) authentication.getPrincipal();
        size = Math.min(size, 50); // cap max size

        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc") ? 
                Sort.Direction.ASC : Sort.Direction.DESC;
        String property = sortParams[0];

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, property));
        return ResponseEntity.ok(projectService.getProjects(userId, status, search, pageable));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ProjectSummaryDto>> getRecentProjects(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.ok(projectService.getRecentProjects(userId));
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDto> getDashboardStats(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();
        return ResponseEntity.ok(projectService.getDashboardStats(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDetailDto> getProject(
            @PathVariable String id,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(projectService.getProject(id, userId, ipAddress, userAgent));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDetailDto> updateProject(
            @PathVariable String id,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(projectService.updateProject(id, userId, request, ipAddress, userAgent));
    }

    @PutMapping("/{id}/diagram")
    public ResponseEntity<SaveDiagramResponseDto> saveDiagram(
            @PathVariable String id,
            @Valid @RequestBody SaveDiagramRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(projectService.saveDiagram(id, userId, request, ipAddress, userAgent));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean hard,
            Authentication authentication,
            HttpServletRequest servletRequest) {
        
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        projectService.deleteProject(id, userId, hard, ipAddress, userAgent);
        return ResponseEntity.noContent().build();
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
