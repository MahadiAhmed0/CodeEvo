package com.codeevo.project.controller;

import com.codeevo.project.dto.request.BulkUpsertCodeFilesRequest;
import com.codeevo.project.dto.request.UpsertCodeFileRequest;
import com.codeevo.project.dto.response.ProjectCodeFileDto;
import com.codeevo.project.dto.response.ProjectCodeTreeDto;
import com.codeevo.project.service.ProjectCodeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing generated code files within a project.
 * <p>
 * All endpoints are scoped under {@code /api/projects/{projectId}/code}
 * and require the authenticated user to be the project owner.
 * </p>
 *
 * <h3>Endpoints</h3>
 * <ul>
 *   <li>{@code POST  .../code}          – Upsert a single file</li>
 *   <li>{@code POST  .../code/bulk}     – Upsert many files at once (agent-friendly)</li>
 *   <li>{@code GET   .../code}          – List all files (flat)</li>
 *   <li>{@code GET   .../code/tree}     – Get hierarchical file tree</li>
 *   <li>{@code DELETE .../code/{codeId}} – Delete a single file</li>
 *   <li>{@code DELETE .../code}          – Delete all code files</li>
 *   <li>{@code GET   .../code/download} – Download all files as a ZIP archive</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/projects/{projectId}/code")
@RequiredArgsConstructor
public class ProjectCodeController {

    private final ProjectCodeService codeService;

    // ─── Upsert single file ──────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ProjectCodeFileDto> upsertFile(
            @PathVariable String projectId,
            @Valid @RequestBody UpsertCodeFileRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        ProjectCodeFileDto dto = codeService.upsertFile(projectId, userId, request, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.OK).body(dto);
    }

    // ─── Bulk upsert ─────────────────────────────────────────────────────────

    @PostMapping("/bulk")
    public ResponseEntity<List<ProjectCodeFileDto>> bulkUpsertFiles(
            @PathVariable String projectId,
            @Valid @RequestBody BulkUpsertCodeFilesRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        List<ProjectCodeFileDto> dtos = codeService.bulkUpsertFiles(projectId, userId, request, ipAddress, userAgent);
        return ResponseEntity.ok(dtos);
    }

    // ─── List (flat) ─────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ProjectCodeFileDto>> getFiles(
            @PathVariable String projectId,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(codeService.getFiles(projectId, userId, ipAddress, userAgent));
    }

    // ─── Tree (hierarchical) ─────────────────────────────────────────────────

    @GetMapping("/tree")
    public ResponseEntity<ProjectCodeTreeDto> getFileTree(
            @PathVariable String projectId,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        return ResponseEntity.ok(codeService.getFileTree(projectId, userId, ipAddress, userAgent));
    }

    // ─── Delete single file ──────────────────────────────────────────────────

    @DeleteMapping("/{codeId}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable String projectId,
            @PathVariable String codeId,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        codeService.deleteFile(projectId, codeId, userId, ipAddress, userAgent);
        return ResponseEntity.noContent().build();
    }

    // ─── Delete all code files ───────────────────────────────────────────────

    @DeleteMapping
    public ResponseEntity<Void> deleteAllFiles(
            @PathVariable String projectId,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        codeService.deleteAllFiles(projectId, userId, ipAddress, userAgent);
        return ResponseEntity.noContent().build();
    }

    // ─── Download ZIP ────────────────────────────────────────────────────────

    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadZip(
            @PathVariable String projectId,
            Authentication authentication,
            HttpServletRequest servletRequest) {

        String userId = (String) authentication.getPrincipal();
        String ipAddress = getClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");

        byte[] zipBytes = codeService.generateZipArchive(projectId, userId, ipAddress, userAgent);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", "project-code-" + projectId + ".zip");
        headers.setContentLength(zipBytes.length);

        return new ResponseEntity<>(zipBytes, headers, HttpStatus.OK);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

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
