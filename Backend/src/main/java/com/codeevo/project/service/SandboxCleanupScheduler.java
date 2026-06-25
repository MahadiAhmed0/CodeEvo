package com.codeevo.project.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class SandboxCleanupScheduler {

    private final DockerExecutionService dockerExecutionService;
    private static final long IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    @Scheduled(fixedRate = 5 * 60 * 1000) // Run every 5 minutes
    public void cleanupIdleSandboxes() {
        long now = System.currentTimeMillis();
        Map<String, Long> activeTimes = dockerExecutionService.getLastActiveTimes();
        
        activeTimes.forEach((projectId, lastActive) -> {
            if (now - lastActive > IDLE_TIMEOUT_MS) {
                if ("RUNNING".equals(dockerExecutionService.getStatus(projectId))) {
                    log.info("Project {} has been idle for more than 30 minutes. Stopping sandbox...", projectId);
                    dockerExecutionService.stopProject(projectId);
                    activeTimes.remove(projectId); // Remove from tracking after stop
                }
            }
        });
    }
}
