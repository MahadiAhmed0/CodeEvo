package com.codeevo.project.service;

import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DockerExecutionService {

    private final ProjectCodeRepository codeRepository;
    private final WebSocketGateway webSocketGateway;
    private final Map<String, Process> activeProcesses = new ConcurrentHashMap<>();
    private final Map<String, String> projectStatus = new ConcurrentHashMap<>();
    private final Map<String, Long> lastActiveTimes = new ConcurrentHashMap<>();
    private final ExecutorService logExecutor = Executors.newCachedThreadPool();

    private static final String WORKSPACE_DIR = System.getProperty("java.io.tmpdir") + "/codeevo-projects";
    private static final String DOMAIN = "sandbox.yourdomain.com";

    /**
     * Start the Docker container for the project.
     * @return The preview URL.
     */
    public String startProject(String projectId) throws Exception {
        updateActivity(projectId);
        
        if (projectStatus.getOrDefault(projectId, "STOPPED").equals("RUNNING")) {
            return getPreviewUrl(projectId);
        }

        projectStatus.put(projectId, "BUILDING");
        exportProject(projectId);

        Path projectDir = Paths.get(WORKSPACE_DIR, projectId);
        
        ProcessBuilder pb = new ProcessBuilder("docker", "compose", "up", "--build", "-d");
        pb.directory(projectDir.toFile());
        pb.redirectErrorStream(true);

        Process process = pb.start();
        streamLogs(projectId, process.getInputStream());
        
        int exitCode = process.waitFor();
        if (exitCode == 0) {
            projectStatus.put(projectId, "RUNNING");
            emitLog(projectId, "[SYSTEM] Container started successfully. Starting log tail...");
            tailLogs(projectId, projectDir);
        } else {
            projectStatus.put(projectId, "FAILED");
            emitLog(projectId, "[ERROR] Container failed to start (exit code " + exitCode + ")");
        }

        return getPreviewUrl(projectId);
    }

    public void stopProject(String projectId) {
        updateActivity(projectId);
        try {
            Path projectDir = Paths.get(WORKSPACE_DIR, projectId);
            ProcessBuilder pb = new ProcessBuilder("docker", "compose", "down");
            pb.directory(projectDir.toFile());
            Process p = pb.start();
            p.waitFor();
            
            Process tailProcess = activeProcesses.remove(projectId);
            if (tailProcess != null) {
                tailProcess.destroy();
            }
            
            projectStatus.put(projectId, "STOPPED");
            emitLog(projectId, "[SYSTEM] Sandbox stopped.");
        } catch (Exception e) {
            log.error("Failed to stop project {}", projectId, e);
        }
    }

    public String getStatus(String projectId) {
        updateActivity(projectId);
        return projectStatus.getOrDefault(projectId, "STOPPED");
    }
    
    public void setStatus(String projectId, String status) {
        projectStatus.put(projectId, status);
    }
    
    public String getPreviewUrl(String projectId) {
        return "https://" + projectId + "." + DOMAIN;
    }
    
    public void updateActivity(String projectId) {
        lastActiveTimes.put(projectId, System.currentTimeMillis());
    }
    
    public Map<String, Long> getLastActiveTimes() {
        return lastActiveTimes;
    }

    private void exportProject(String projectId) throws IOException {
        List<ProjectCode> files = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);
        Path projectDir = Paths.get(WORKSPACE_DIR, projectId);
        if (Files.exists(projectDir)) {
            Files.walk(projectDir)
                .sorted(Comparator.reverseOrder())
                .map(Path::toFile)
                .forEach(File::delete);
        }
        Files.createDirectories(projectDir);

        ProjectCode composeFile = null;

        for (ProjectCode file : files) {
            Path filePath = projectDir.resolve(file.getFilePath());
            Files.createDirectories(filePath.getParent());
            Files.writeString(filePath, file.getContent());

            if (file.getFilePath().equals("Dockerfile") || file.getFilePath().endsWith("/Dockerfile")) {
                normalizeDockerfileBaseImages(projectId, filePath);
            }
            
            if (file.getFilePath().equals("docker-compose.yml")) {
                composeFile = file;
            }
        }

        if (composeFile != null) {
            injectTraefikAndLimits(projectDir.resolve("docker-compose.yml"), projectId);
        } else {
            emitLog(projectId, "[WARNING] No docker-compose.yml found in project files.");
        }
    }

    private void normalizeDockerfileBaseImages(String projectId, Path dockerfilePath) throws IOException {
        String content = Files.readString(dockerfilePath);
        String normalized = content
            .replaceAll("(?im)^FROM\\s+openjdk:17-jdk-slim\\s+AS\\s+(\\S+)", "FROM maven:3.9-eclipse-temurin-17 AS $1")
            .replace("FROM openjdk:17-jdk-slim", "FROM eclipse-temurin:17-jdk-jammy")
            .replace("FROM openjdk:17-jre-slim", "FROM eclipse-temurin:17-jre-jammy")
            .replace("FROM openjdk:17", "FROM eclipse-temurin:17-jdk-jammy");

        if (!normalized.equals(content)) {
            Files.writeString(dockerfilePath, normalized);
            emitLog(projectId, "[WARNING] Replaced deprecated Docker base image in " + projectDirRelativeName(dockerfilePath) + ".");
        }
    }

    private String projectDirRelativeName(Path path) {
        Path fileName = path.getFileName();
        return fileName != null ? fileName.toString() : path.toString();
    }

    @SuppressWarnings("unchecked")
    private void injectTraefikAndLimits(Path composePath, String projectId) throws IOException {
        Yaml yaml = new Yaml();
        try (InputStream in = Files.newInputStream(composePath)) {
            Map<String, Object> data = yaml.load(in);
            if (data != null && data.containsKey("services")) {
                Map<String, Object> services = (Map<String, Object>) data.get("services");
                if (services != null && !services.isEmpty()) {
                    // Inject into the first service
                    String firstServiceName = services.keySet().iterator().next();
                    Map<String, Object> appService = (Map<String, Object>) services.get(firstServiceName);
                    
                    appService.put("mem_limit", "512m");
                    appService.put("cpus", 0.5);
                    
                    // Remove ports binding
                    appService.remove("ports");
                    appService.put("expose", Collections.singletonList("8080"));
                    
                    // Networks
                    List<String> networks = (List<String>) appService.get("networks");
                    if (networks == null) {
                        networks = new ArrayList<>();
                        networks.add("default"); // preserve default network for DB access
                    }
                    if (!networks.contains("codeevo-proxy-net")) {
                        networks.add("codeevo-proxy-net");
                        appService.put("networks", networks);
                    }
                    
                    // Labels
                    List<String> labels = new ArrayList<>();
                    labels.add("traefik.enable=true");
                    labels.add("traefik.http.routers.proj-" + projectId + ".rule=Host(`" + projectId + "." + DOMAIN + "`)");
                    labels.add("traefik.http.services.proj-" + projectId + ".loadbalancer.server.port=8080");
                    labels.add("codeevo.managed=true");
                    appService.put("labels", labels);
                    
                    // Top level network
                    Map<String, Object> topNetworks = (Map<String, Object>) data.getOrDefault("networks", new HashMap<>());
                    Map<String, Object> proxyNet = new HashMap<>();
                    proxyNet.put("external", true);
                    proxyNet.put("name", "codeevo-proxy-net");
                    topNetworks.put("codeevo-proxy-net", proxyNet);
                    data.put("networks", topNetworks);
                    
                    // Write back
                    try (Writer writer = Files.newBufferedWriter(composePath)) {
                        yaml.dump(data, writer);
                    }
                }
            }
        }
    }

    private void tailLogs(String projectId, Path projectDir) {
        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "compose", "logs", "-f");
            pb.directory(projectDir.toFile());
            pb.redirectErrorStream(true);
            Process process = pb.start();
            activeProcesses.put(projectId, process);
            streamLogs(projectId, process.getInputStream());
        } catch (Exception e) {
            log.error("Failed to tail logs for {}", projectId, e);
        }
    }

    private void streamLogs(String projectId, InputStream inputStream) {
        logExecutor.submit(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    emitLog(projectId, line);
                }
            } catch (IOException e) {
                // stream closed
            }
        });
    }

    private void emitLog(String projectId, String message) {
        webSocketGateway.emitDockerLog(projectId, message);
    }
}
