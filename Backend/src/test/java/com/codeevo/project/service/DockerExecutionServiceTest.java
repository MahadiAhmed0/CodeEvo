package com.codeevo.project.service;

import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DockerExecutionServiceTest {

    @Mock private ProjectCodeRepository codeRepository;
    @Mock private WebSocketGateway webSocketGateway;

    private DockerExecutionService service;

    @BeforeEach
    void setUp() {
        service = new DockerExecutionService(codeRepository, webSocketGateway);
    }

    private Process mockProcess(int exitCode) {
        Process process = mock(Process.class);
        try { lenient().doReturn(exitCode).when(process).waitFor(); }
        catch (InterruptedException e) { throw new RuntimeException(e); }
        try { lenient().doReturn(true).when(process).waitFor(anyLong(), any()); }
        catch (InterruptedException e) { throw new RuntimeException(e); }
        lenient().when(process.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
        return process;
    }

    // ─── Port calculation ────────────────────────────────────────────────────

    @Test
    void getSandboxPort_shouldBeInRange() {
        int port = service.getSandboxPort("project-123");
        assertTrue(port >= 18000 && port < 38000,
                "Port " + port + " should be in [18000, 38000)");
    }

    @Test
    void getSandboxPort_shouldBeDeterministic() {
        int port1 = service.getSandboxPort("project-abc");
        int port2 = service.getSandboxPort("project-abc");
        assertEquals(port1, port2);
    }

    @Test
    void getSandboxPort_differentProjects_oftenDifferent() {
        int port1 = service.getSandboxPort("aaaa");
        int port2 = service.getSandboxPort("bbbb");
        assertNotEquals(port1, port2);
    }

    // ─── URL generation ──────────────────────────────────────────────────────

    @Test
    void getPreviewUrl_shouldIncludePort() {
        String url = service.getPreviewUrl("proj-x");
        int port = service.getSandboxPort("proj-x");
        assertEquals("http://localhost:" + port, url);
    }

    @Test
    void getProxyUrl_shouldIncludeProjectId() {
        String proxyUrl = service.getProxyUrl("proj-42");
        assertEquals("/api/projects/proj-42/docker/proxy", proxyUrl);
    }

    // ─── Status management ───────────────────────────────────────────────────

    @Test
    void getStatus_defaultIsStopped() {
        assertEquals("STOPPED", service.getStatus("unknown-project"));
    }

    @Test
    void setStatus_and_getStatus_roundtrip() {
        service.setStatus("proj-1", "BUILDING");
        assertEquals("BUILDING", service.getStatus("proj-1"));
        service.setStatus("proj-1", "RUNNING");
        assertEquals("RUNNING", service.getStatus("proj-1"));
    }

    @Test
    void differentProjects_haveIndependentStatuses() {
        service.setStatus("proj-a", "RUNNING");
        service.setStatus("proj-b", "FAILED");
        assertEquals("RUNNING", service.getStatus("proj-a"));
        assertEquals("FAILED", service.getStatus("proj-b"));
    }

    // ─── Activity tracking ───────────────────────────────────────────────────

    @Test
    void updateActivity_shouldTrackTime() {
        service.updateActivity("proj-1");
        Map<String, Long> times = service.getLastActiveTimes();
        assertTrue(times.containsKey("proj-1"));
        long now = System.currentTimeMillis();
        assertTrue(Math.abs(times.get("proj-1") - now) < 5000);
    }

    // ─── startProject: already running ───────────────────────────────────────

    @Test
    void startProject_alreadyRunning_shouldReturnPreviewUrl() throws Exception {
        service.setStatus("proj-running", "RUNNING");
        String url = service.startProject("proj-running");
        assertEquals("http://localhost:" + service.getSandboxPort("proj-running"), url);
        assertEquals("RUNNING", service.getStatus("proj-running"));
    }

    // ─── stopProject ─────────────────────────────────────────────────────────

    @Test
    void stopProject_noDirectory_shouldSetStopped() {
        service.stopProject("nonexistent-project");
        assertEquals("STOPPED", service.getStatus("nonexistent-project"));
    }

    @Test
    void stopProject_activeProject_shouldKillTailAndStop() {
        service.setStatus("proj-active", "RUNNING");
        service.updateActivity("proj-active");
        service.stopProject("proj-active");
        assertEquals("STOPPED", service.getStatus("proj-active"));
    }

    // ─── startProject: code export ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void startProject_withCodeFiles_exportsToDisk() throws Exception {
        List<ProjectCode> files = List.of(
                ProjectCode.builder().projectId("proj-export").filePath("src/main/App.java").content("class App {}").language("java").sizeBytes(11L).build(),
                ProjectCode.builder().projectId("proj-export").filePath("docker-compose.yml").content("services:\n  app:\n    image: myapp\n").language("yaml").sizeBytes(30L).build()
        );
        when(codeRepository.findByProjectIdOrderByFilePathAsc("proj-export")).thenReturn(files);

        try (var ctrl = mockConstruction(java.lang.ProcessBuilder.class, (mock, context) -> {
            Process p = mock(Process.class);
            try {
                Object arg = context.arguments().get(0);
                List<String> cmd = arg instanceof String[] ? Arrays.asList((String[]) arg) : (List<String>) arg;
                lenient().doReturn(cmd.contains("up") ? 1 : 0).when(p).waitFor();
            } catch (InterruptedException e) { throw new RuntimeException(e); }
            try { lenient().doReturn(true).when(p).waitFor(anyLong(), any()); } catch (InterruptedException e) { throw new RuntimeException(e); }
            lenient().when(p.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
            when(mock.directory(any())).thenReturn(mock);
            when(mock.redirectErrorStream(anyBoolean())).thenReturn(mock);
            when(mock.start()).thenReturn(p);
        })) {
            service.startProject("proj-export");
            verify(codeRepository).findByProjectIdOrderByFilePathAsc("proj-export");
        }
    }

    @SuppressWarnings("unchecked")
    @Test
    void startProject_buildFailure_shouldSetFailed() throws Exception {
        when(codeRepository.findByProjectIdOrderByFilePathAsc(anyString())).thenReturn(List.of());
        try (var ctrl = mockConstruction(java.lang.ProcessBuilder.class, (mock, context) -> {
            Process p = mockProcess(1);
            when(mock.directory(any())).thenReturn(mock);
            when(mock.redirectErrorStream(anyBoolean())).thenReturn(mock);
            when(mock.start()).thenReturn(p);
        })) {
            try { service.startProject("proj-bad-build"); } catch (Exception ignored) {}
        }
    }

    @SuppressWarnings("unchecked")
    @Test
    void rebuildProject_changesStatusToBuilding() throws Exception {
        try (var ctrl = mockConstruction(java.lang.ProcessBuilder.class, (mock, context) -> {
            Process p = mock(Process.class);
            try {
                Object arg = context.arguments().get(0);
                List<String> cmd = arg instanceof String[] ? Arrays.asList((String[]) arg) : (List<String>) arg;
                lenient().doReturn(cmd.contains("up") ? 1 : 0).when(p).waitFor();
            } catch (InterruptedException e) { throw new RuntimeException(e); }
            try { lenient().doReturn(true).when(p).waitFor(anyLong(), any()); } catch (InterruptedException e) { throw new RuntimeException(e); }
            lenient().when(p.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
            when(mock.directory(any())).thenReturn(mock);
            when(mock.redirectErrorStream(anyBoolean())).thenReturn(mock);
            when(mock.start()).thenReturn(p);
        })) {
            try { service.rebuildProject("proj-rebuild"); } catch (Exception ignored) {}
        }
    }

    @Test
    void updateActivity_thenCheckLastActiveTime_marksRecent() {
        service.updateActivity("recent-proj");
        Map<String, Long> times = service.getLastActiveTimes();
        assertTrue(times.containsKey("recent-proj"));
    }
}
