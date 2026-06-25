package com.codeevo.project.controller;

import com.codeevo.project.service.DockerExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/projects/{projectId}/docker")
@RequiredArgsConstructor
public class DockerController {

    private final DockerExecutionService dockerExecutionService;

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startDocker(@PathVariable String projectId) {
        try {
            String previewUrl = dockerExecutionService.startProject(projectId);
            return ResponseEntity.ok(Map.of("status", "BUILDING", "previewUrl", previewUrl));
        } catch (Exception e) {
            log.error("Failed to start docker for project {}", projectId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<Void> stopDocker(@PathVariable String projectId) {
        dockerExecutionService.stopProject(projectId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/restart")
    public ResponseEntity<Map<String, String>> restartDocker(@PathVariable String projectId) {
        dockerExecutionService.stopProject(projectId);
        try {
            String previewUrl = dockerExecutionService.startProject(projectId);
            return ResponseEntity.ok(Map.of("status", "BUILDING", "previewUrl", previewUrl));
        } catch (Exception e) {
            log.error("Failed to restart docker for project {}", projectId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getDockerStatus(@PathVariable String projectId) {
        String status = dockerExecutionService.getStatus(projectId);
        String previewUrl = dockerExecutionService.getPreviewUrl(projectId);
        return ResponseEntity.ok(Map.of("status", status, "previewUrl", previewUrl));
    }
}
