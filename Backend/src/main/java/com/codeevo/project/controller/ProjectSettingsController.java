package com.codeevo.project.controller;

import com.codeevo.project.dto.request.UpdateProjectSettingsRequest;
import com.codeevo.project.dto.response.ProjectSettingsDto;
import com.codeevo.project.service.ProjectService;
import com.codeevo.project.service.ProjectSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/settings")
@RequiredArgsConstructor
public class ProjectSettingsController {

    private final ProjectSettingsService settingsService;
    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<ProjectSettingsDto> getSettings(
            @PathVariable String projectId,
            Authentication authentication,
            HttpServletRequest servletRequest) {
            
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        // Validate ownership first
        projectService.getProject(projectId, userId, ipAddress, userAgent);

        return ResponseEntity.ok(settingsService.getSettings(projectId));
    }

    @PutMapping
    public ResponseEntity<ProjectSettingsDto> updateSettings(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateProjectSettingsRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {
            
        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        // Validate ownership first
        projectService.getProject(projectId, userId, ipAddress, userAgent);

        return ResponseEntity.ok(settingsService.updateSettings(projectId, userId, request));
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
