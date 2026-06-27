package com.codeevo.project.service;

import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.yaml.snakeyaml.Yaml;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Pattern;

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
    private final HttpClient sandboxHttpClient = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();

    private static final String WORKSPACE_DIR = System.getProperty("java.io.tmpdir") + "/codeevo-projects";
    private static final String DOMAIN = "sandbox.yourdomain.com";
    private static final int SANDBOX_PORT_BASE = 18000;
    private static final int SANDBOX_PORT_RANGE = 20000;

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
            emitLog(projectId, "[SYSTEM] Container built. Waiting for app server on " + getPreviewUrl(projectId) + "...");
            boolean ready = waitForSandboxServer(projectId);
            projectStatus.put(projectId, "RUNNING");
            if (ready) {
                emitLog(projectId, "[SYSTEM] Container started successfully. Starting log tail...");
            } else {
                emitLog(projectId, "[WARNING] Container is running, but the app server did not respond before the readiness timeout. Check Problems and logs.");
            }
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
        return "http://localhost:" + getSandboxPort(projectId);
    }

    public String getProxyUrl(String projectId) {
        return "/api/projects/" + projectId + "/docker/proxy";
    }

    public int getSandboxPort(String projectId) {
        return SANDBOX_PORT_BASE + Math.floorMod(projectId.hashCode(), SANDBOX_PORT_RANGE);
    }

    public ResponseEntity<byte[]> proxyRequest(String projectId, String method, String pathAndQuery, HttpHeaders incomingHeaders, byte[] body) throws Exception {
        updateActivity(projectId);
        String normalizedPath = pathAndQuery == null || pathAndQuery.isBlank() ? "/" : pathAndQuery;
        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }

        URI targetUri = URI.create("http://127.0.0.1:" + getSandboxPort(projectId) + normalizedPath);
        HttpRequest.Builder builder = HttpRequest.newBuilder(targetUri)
            .method(method, requestBody(method, body));

        incomingHeaders.forEach((name, values) -> {
            if (shouldForwardHeader(name)) {
                values.forEach(value -> builder.header(name, value));
            }
        });

        HttpResponse<byte[]> response = sandboxHttpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
        HttpHeaders responseHeaders = new HttpHeaders();
        response.headers().map().forEach((name, values) -> {
            if (shouldReturnHeader(name)) {
                responseHeaders.put(name, values);
            }
        });

        return ResponseEntity
            .status(HttpStatusCode.valueOf(response.statusCode()))
            .headers(responseHeaders)
            .body(response.body());
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

            if (file.getFilePath().endsWith("application.yml") || file.getFilePath().endsWith("application.yaml")) {
                normalizeSpringYaml(projectId, filePath);
            }

            if (file.getFilePath().endsWith("application.properties")) {
                normalizeSpringProperties(projectId, filePath);
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
    private void normalizeSpringYaml(String projectId, Path configPath) throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> data;
        try (InputStream in = Files.newInputStream(configPath)) {
            Object loaded = yaml.load(in);
            data = loaded instanceof Map<?, ?> ? (Map<String, Object>) loaded : new LinkedHashMap<>();
        }

        Map<String, Object> spring = ensureMap(data, "spring");
        Map<String, Object> jpa = ensureMap(spring, "jpa");
        Object current = jpa.put("open-in-view", false);

        if (!Objects.equals(current, false)) {
            try (Writer writer = Files.newBufferedWriter(configPath)) {
                yaml.dump(data, writer);
            }
            emitLog(projectId, "[SYSTEM] Set spring.jpa.open-in-view=false in " + projectDirRelativeName(configPath) + ".");
        }
    }

    private void normalizeSpringProperties(String projectId, Path configPath) throws IOException {
        String content = Files.readString(configPath);
        String normalized = content;
        if (Pattern.compile("^spring\\.jpa\\.open-in-view\\s*=.*$", Pattern.MULTILINE).matcher(content).find()) {
            normalized = content.replaceAll("(?m)^spring\\.jpa\\.open-in-view\\s*=.*$", "spring.jpa.open-in-view=false");
        } else {
            normalized = content.stripTrailing() + System.lineSeparator() + "spring.jpa.open-in-view=false" + System.lineSeparator();
        }

        if (!normalized.equals(content)) {
            Files.writeString(configPath, normalized);
            emitLog(projectId, "[SYSTEM] Set spring.jpa.open-in-view=false in " + projectDirRelativeName(configPath) + ".");
        }
    }

    @SuppressWarnings("unchecked")
    private void injectTraefikAndLimits(Path composePath, String projectId) throws IOException {
        Yaml yaml = new Yaml();
        try (InputStream in = Files.newInputStream(composePath)) {
            Map<String, Object> data = yaml.load(in);
            if (data != null && data.containsKey("services")) {
                data.remove("version");
                Map<String, Object> services = (Map<String, Object>) data.get("services");
                if (services != null && !services.isEmpty()) {
                    String appServiceName = selectAppServiceName(services);
                    Map<String, Object> appService = (Map<String, Object>) services.get(appServiceName);
                    
                    appService.put("mem_limit", "512m");
                    appService.put("cpus", 0.5);
                    
                    // Publish a deterministic localhost port so the backend proxy and browser preview can reach the sandbox.
                    appService.put("ports", Collections.singletonList("127.0.0.1:" + getSandboxPort(projectId) + ":8080"));
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> ensureMap(Map<String, Object> parent, String key) {
        Object existing = parent.get(key);
        if (existing instanceof Map<?, ?> existingMap) {
            return (Map<String, Object>) existingMap;
        }
        Map<String, Object> created = new LinkedHashMap<>();
        parent.put(key, created);
        return created;
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

    private boolean waitForSandboxServer(String projectId) {
        long deadline = System.currentTimeMillis() + Duration.ofSeconds(60).toMillis();
        URI healthUri = URI.create("http://127.0.0.1:" + getSandboxPort(projectId) + "/");

        while (System.currentTimeMillis() < deadline) {
            try {
                HttpRequest request = HttpRequest.newBuilder(healthUri)
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();
                sandboxHttpClient.send(request, HttpResponse.BodyHandlers.discarding());
                return true;
            } catch (Exception ignored) {
                try {
                    Thread.sleep(1500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }

        return false;
    }

    @SuppressWarnings("unchecked")
    private String selectAppServiceName(Map<String, Object> services) {
        for (Map.Entry<String, Object> entry : services.entrySet()) {
            if (entry.getValue() instanceof Map<?, ?> serviceMap && ((Map<String, Object>) serviceMap).containsKey("build")) {
                return entry.getKey();
            }
        }

        for (Map.Entry<String, Object> entry : services.entrySet()) {
            if (entry.getValue() instanceof Map<?, ?> serviceMap) {
                Object image = ((Map<String, Object>) serviceMap).get("image");
                String imageName = image == null ? "" : image.toString().toLowerCase(Locale.ROOT);
                if (!imageName.contains("postgres")
                    && !imageName.contains("mongo")
                    && !imageName.contains("mysql")
                    && !imageName.contains("redis")
                    && !imageName.contains("rabbitmq")) {
                    return entry.getKey();
                }
            }
        }

        return services.keySet().iterator().next();
    }

    private HttpRequest.BodyPublisher requestBody(String method, byte[] body) {
        if (method.equalsIgnoreCase("GET") || method.equalsIgnoreCase("HEAD")) {
            return HttpRequest.BodyPublishers.noBody();
        }
        return body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body);
    }

    private boolean shouldForwardHeader(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return !lower.equals("host")
            && !lower.equals("connection")
            && !lower.equals("content-length")
            && !lower.equals("authorization")
            && !lower.equals("cookie")
            && !lower.startsWith("sec-");
    }

    private boolean shouldReturnHeader(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return !lower.equals("transfer-encoding")
            && !lower.equals("connection")
            && !lower.equals("content-length");
    }
}
