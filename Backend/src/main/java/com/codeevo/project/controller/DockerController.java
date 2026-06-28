package com.codeevo.project.controller;

import com.codeevo.project.service.DockerExecutionService;
import com.codeevo.project.service.SandboxEndpointDiscoveryService;
import com.codeevo.project.dto.response.SandboxEndpointDto;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/projects/{projectId}/docker")
@RequiredArgsConstructor
public class DockerController {

    private final DockerExecutionService dockerExecutionService;
    private final SandboxEndpointDiscoveryService endpointDiscoveryService;

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startDocker(@PathVariable String projectId) {
        try {
            String previewUrl = dockerExecutionService.startProject(projectId);
            return ResponseEntity.ok(statusBody(projectId, dockerExecutionService.getStatus(projectId), previewUrl));
        } catch (Exception e) {
            log.error("Failed to start docker for project {}", projectId, e);
            return ResponseEntity.internalServerError().body(Map.<String, Object>of("error", e.getMessage()));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<Void> stopDocker(@PathVariable String projectId) {
        dockerExecutionService.stopProject(projectId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/restart")
    public ResponseEntity<Map<String, Object>> restartDocker(@PathVariable String projectId) {
        try {
            String previewUrl = dockerExecutionService.rebuildProject(projectId);
            return ResponseEntity.ok(statusBody(projectId, dockerExecutionService.getStatus(projectId), previewUrl));
        } catch (Exception e) {
            log.error("Failed to rebuild docker for project {}", projectId, e);
            return ResponseEntity.internalServerError().body(Map.<String, Object>of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDockerStatus(@PathVariable String projectId) {
        String status = dockerExecutionService.getStatus(projectId);
        String previewUrl = dockerExecutionService.getPreviewUrl(projectId);
        return ResponseEntity.ok(statusBody(projectId, status, previewUrl));
    }

    @GetMapping("/endpoints")
    public ResponseEntity<List<SandboxEndpointDto>> discoverEndpoints(@PathVariable String projectId) {
        return ResponseEntity.ok(endpointDiscoveryService.discover(projectId));
    }

    @RequestMapping(
            value = "/proxy/**",
            method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.HEAD, RequestMethod.OPTIONS}
    )
    public ResponseEntity<byte[]> proxySandboxRequest(
            @PathVariable String projectId,
            HttpServletRequest request,
            @RequestHeader HttpHeaders headers,
            @RequestBody(required = false) byte[] body
    ) {
        try {
            String pathAndQuery = extractProxyPath(request);
            return dockerExecutionService.proxyRequest(projectId, request.getMethod(), pathAndQuery, headers, body);
        } catch (Exception e) {
            log.error("Failed to proxy sandbox request for project {}", projectId, e);
            return ResponseEntity.status(502).body(("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}").getBytes());
        }
    }

    private Map<String, Object> statusBody(String projectId, String status, String previewUrl) {
        return Map.of(
                "status", status,
                "previewUrl", previewUrl,
                "proxyUrl", dockerExecutionService.getProxyUrl(projectId),
                "port", dockerExecutionService.getSandboxPort(projectId)
        );
    }

    private String extractProxyPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String marker = "/docker/proxy";
        int idx = uri.indexOf(marker);
        String path = idx >= 0 ? uri.substring(idx + marker.length()) : "/";
        if (path.isBlank()) path = "/";
        String query = request.getQueryString();
        return query == null || query.isBlank() ? path : path + "?" + query;
    }
}
