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
            tailLogs(projectId, projectDir);
            emitLog(projectId, "[SYSTEM] Container built. Waiting for app server on " + getPreviewUrl(projectId) + "...");
            boolean ready = waitForSandboxServer(projectId);
            if (ready) {
                projectStatus.put(projectId, "RUNNING");
                emitLog(projectId, "[SYSTEM] Container started successfully. Starting log tail...");
            } else {
                projectStatus.put(projectId, "FAILED");
                emitLog(projectId, "[ERROR] App server did not respond before the readiness timeout. Check Problems and logs.");
            }
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
        deleteProjectDir(projectId, projectDir);
        Files.createDirectories(projectDir);

        ProjectCode composeFile = null;
        Path pomPath = null;
        List<Path> springConfigPaths = new ArrayList<>();

        for (ProjectCode file : files) {
            Path filePath = projectDir.resolve(file.getFilePath());
            Files.createDirectories(filePath.getParent());
            Files.writeString(filePath, file.getContent());

            if (file.getFilePath().equals("Dockerfile") || file.getFilePath().endsWith("/Dockerfile")) {
                normalizeDockerfileBaseImages(projectId, filePath);
            }

            if (file.getFilePath().endsWith("application.yml") || file.getFilePath().endsWith("application.yaml")) {
                springConfigPaths.add(filePath);
                normalizeSpringYaml(projectId, filePath);
            }

            if (file.getFilePath().endsWith("application.properties")) {
                springConfigPaths.add(filePath);
                normalizeSpringProperties(projectId, filePath);
            }

            if (file.getFilePath().equals("pom.xml") || file.getFilePath().endsWith("/pom.xml")) {
                pomPath = filePath;
            }
            
            if (file.getFilePath().equals("docker-compose.yml")) {
                composeFile = file;
            }
        }

        if (pomPath != null) {
            ensureSpringSecurityDependency(projectId, pomPath, projectDir);
        }

        fixMissingJavaImports(projectId, projectDir);

        if (composeFile != null) {
            Path composePath = projectDir.resolve("docker-compose.yml");
            injectTraefikAndLimits(composePath, projectId);
            repairSpringDatasource(projectId, composePath, springConfigPaths, pomPath);
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

        // Build stages using JDK images need Maven installed — replace with maven image
        normalized = normalized.replaceAll("(?im)^FROM\\s+eclipse-temurin:17-jdk-jammy\\s+AS\\s+(\\S+)", "FROM maven:3.9-eclipse-temurin-17 AS $1");

        // If ./mvnw is referenced but mvnw file may be missing, replace with mvn (Maven is on PATH in the maven image)
        normalized = normalized.replace("./mvnw", "mvn");

        if (!normalized.equals(content)) {
            Files.writeString(dockerfilePath, normalized);
            emitLog(projectId, "[SYSTEM] Normalized Dockerfile build stage to use maven:3.9-eclipse-temurin-17 for Maven support.");
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
    private void repairSpringDatasource(String projectId, Path composePath, List<Path> springConfigPaths, Path pomPath) throws IOException {
        DbService db = findPrimaryDbService(composePath);
        if (db == null) return;

        if (springConfigPaths.isEmpty()) {
            Path projectRoot = pomPath != null && pomPath.getParent() != null ? pomPath.getParent() : composePath.getParent();
            Path configPath = projectRoot.resolve("src/main/resources/application.yml");
            Files.createDirectories(configPath.getParent());
            Files.writeString(configPath, "spring:\n  jpa:\n    open-in-view: false\n");
            springConfigPaths.add(configPath);
            emitLog(projectId, "[SYSTEM] Created missing Spring application.yml for Docker datasource configuration.");
        }

        for (Path configPath : springConfigPaths) {
            if (configPath.toString().endsWith(".properties")) {
                repairSpringDatasourceProperties(projectId, configPath, db);
            } else {
                repairSpringDatasourceYaml(projectId, configPath, db);
            }
        }

        if (pomPath != null) {
            ensureJdbcDriverDependency(projectId, pomPath, db);
        }
    }

    @SuppressWarnings("unchecked")
    private DbService findPrimaryDbService(Path composePath) throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> data;
        try (InputStream in = Files.newInputStream(composePath)) {
            Object loaded = yaml.load(in);
            data = loaded instanceof Map<?, ?> ? (Map<String, Object>) loaded : null;
        }
        if (data == null || !(data.get("services") instanceof Map<?, ?> servicesRaw)) return null;

        Map<String, Object> services = (Map<String, Object>) servicesRaw;
        List<String> candidates = new ArrayList<>();
        String appServiceName = selectAppServiceName(services);
        if (services.get(appServiceName) instanceof Map<?, ?> appService) {
            candidates.addAll(dependsOnServiceNames(((Map<String, Object>) appService).get("depends_on")));
        }
        candidates.addAll(services.keySet());

        Set<String> visited = new LinkedHashSet<>(candidates);
        for (String serviceName : visited) {
            if (serviceName.equals(appServiceName)) continue;
            DbService db = dbServiceFromComposeService(serviceName, services.get(serviceName));
            if (db != null) return db;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private DbService dbServiceFromComposeService(String serviceName, Object rawService) {
        if (!(rawService instanceof Map<?, ?> serviceRaw)) return null;
        Map<String, Object> service = (Map<String, Object>) serviceRaw;
        String image = String.valueOf(service.getOrDefault("image", "")).toLowerCase(Locale.ROOT);
        if (image.contains("postgres")) {
            Map<String, String> env = parseEnvironment(service.get("environment"));
            String username = env.getOrDefault("POSTGRES_USER", "postgres");
            String password = env.getOrDefault("POSTGRES_PASSWORD", "postgres");
            String database = env.getOrDefault("POSTGRES_DB", username);
            return new DbService("postgres", serviceName, database, username, password);
        }
        if (image.contains("mysql") || image.contains("mariadb")) {
            Map<String, String> env = parseEnvironment(service.get("environment"));
            String username = env.getOrDefault("MYSQL_USER", "root");
            String password = env.getOrDefault("MYSQL_PASSWORD", env.getOrDefault("MYSQL_ROOT_PASSWORD", "password"));
            String database = env.getOrDefault("MYSQL_DATABASE", "app");
            return new DbService("mysql", serviceName, database, username, password);
        }
        return null;
    }

    private List<String> dependsOnServiceNames(Object rawDependsOn) {
        if (rawDependsOn instanceof Map<?, ?> map) {
            return map.keySet().stream().map(String::valueOf).toList();
        }
        if (rawDependsOn instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseEnvironment(Object rawEnvironment) {
        Map<String, String> env = new HashMap<>();
        if (rawEnvironment instanceof Map<?, ?> map) {
            map.forEach((key, value) -> env.put(String.valueOf(key), String.valueOf(value)));
        } else if (rawEnvironment instanceof List<?> list) {
            for (Object item : list) {
                String value = String.valueOf(item);
                int idx = value.indexOf('=');
                if (idx > 0) {
                    env.put(value.substring(0, idx), value.substring(idx + 1));
                }
            }
        }
        return env;
    }

    @SuppressWarnings("unchecked")
    private void repairSpringDatasourceYaml(String projectId, Path configPath, DbService db) throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> data;
        try (InputStream in = Files.newInputStream(configPath)) {
            Object loaded = yaml.load(in);
            data = loaded instanceof Map<?, ?> ? (Map<String, Object>) loaded : new LinkedHashMap<>();
        }

        Map<String, Object> spring = ensureMap(data, "spring");
        Map<String, Object> datasource = ensureMap(spring, "datasource");
        boolean changed = putIfMissing(datasource, "url", db.jdbcUrl());
        changed |= putIfMissing(datasource, "username", db.username());
        changed |= putIfMissing(datasource, "password", db.password());
        changed |= putIfMissing(datasource, "driver-class-name", db.driverClassName());

        Map<String, Object> jpa = ensureMap(spring, "jpa");
        changed |= putIfMissing(jpa, "open-in-view", false);
        changed |= putIfMissing(jpa, "database-platform", db.hibernateDialect());
        Map<String, Object> hibernate = ensureMap(jpa, "hibernate");
        changed |= putIfMissing(hibernate, "ddl-auto", "update");

        if (changed) {
            try (Writer writer = Files.newBufferedWriter(configPath)) {
                yaml.dump(data, writer);
            }
            emitLog(projectId, "[SYSTEM] Added Docker datasource settings for " + db.serviceName() + " in " + projectDirRelativeName(configPath) + ".");
        }
    }

    private void repairSpringDatasourceProperties(String projectId, Path configPath, DbService db) throws IOException {
        String content = Files.readString(configPath);
        String normalized = content;
        normalized = ensureProperty(normalized, "spring.datasource.url", db.jdbcUrl());
        normalized = ensureProperty(normalized, "spring.datasource.username", db.username());
        normalized = ensureProperty(normalized, "spring.datasource.password", db.password());
        normalized = ensureProperty(normalized, "spring.datasource.driver-class-name", db.driverClassName());
        normalized = ensureProperty(normalized, "spring.jpa.database-platform", db.hibernateDialect());
        normalized = ensureProperty(normalized, "spring.jpa.hibernate.ddl-auto", "update");
        normalized = ensureProperty(normalized, "spring.jpa.open-in-view", "false");

        if (!normalized.equals(content)) {
            Files.writeString(configPath, normalized);
            emitLog(projectId, "[SYSTEM] Added Docker datasource settings for " + db.serviceName() + " in " + projectDirRelativeName(configPath) + ".");
        }
    }

    private boolean putIfMissing(Map<String, Object> map, String key, Object value) {
        Object existing = map.get(key);
        if (existing == null || existing.toString().isBlank()) {
            map.put(key, value);
            return true;
        }
        return false;
    }

    private String ensureProperty(String content, String key, String value) {
        Pattern pattern = Pattern.compile("^" + Pattern.quote(key) + "\\s*=.*$", Pattern.MULTILINE);
        if (pattern.matcher(content).find()) return content;
        return content.stripTrailing() + System.lineSeparator() + key + "=" + value + System.lineSeparator();
    }

    private void ensureJdbcDriverDependency(String projectId, Path pomPath, DbService db) throws IOException {
        String content = Files.readString(pomPath);
        String dependency;
        String marker;
        if (db.engine().equals("postgres")) {
            marker = "org.postgresql";
            dependency = """
                    <dependency>
                        <groupId>org.postgresql</groupId>
                        <artifactId>postgresql</artifactId>
                        <scope>runtime</scope>
                    </dependency>
                """;
        } else {
            marker = "mysql-connector-j";
            dependency = """
                    <dependency>
                        <groupId>com.mysql</groupId>
                        <artifactId>mysql-connector-j</artifactId>
                        <scope>runtime</scope>
                    </dependency>
                """;
        }

        if (content.contains(marker) || !content.contains("</dependencies>")) return;

        String updated = content.replace("</dependencies>", dependency + "\n    </dependencies>");
        Files.writeString(pomPath, updated);
        emitLog(projectId, "[SYSTEM] Added " + db.engine() + " JDBC driver dependency to " + projectDirRelativeName(pomPath) + ".");
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

    private void deleteProjectDir(String projectId, Path projectDir) {
        if (!Files.exists(projectDir)) return;
        int maxRetries = 5;
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                Files.walk(projectDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            File f = p.toFile();
                            if (f.isDirectory()) {
                                f.delete();
                            } else {
                                f.setWritable(true);
                                Files.deleteIfExists(p);
                            }
                        } catch (IOException ignored) {}
                    });
                if (!Files.exists(projectDir)) return;
            } catch (IOException ignored) {}
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        emitLog(projectId, "[WARNING] Could not fully clean project directory after " + maxRetries + " attempts. Some files may remain.");
    }

    private void ensureSpringSecurityDependency(String projectId, Path pomPath, Path projectDir) throws IOException {
        String pomContent = Files.readString(pomPath);
        boolean hasSecurityDep = pomContent.contains("spring-boot-starter-security");
        boolean hasSecurityConfig = false;
        String mainAppPackage = null;
        boolean needsSecurity = false;

        try (var files = Files.walk(projectDir)) {
            for (var p : (Iterable<Path>) files::iterator) {
                if (!p.toString().endsWith(".java")) continue;
                String src = Files.readString(p);
                if (src.contains("org.springframework.security")) {
                    needsSecurity = true;
                }
                if (src.contains("SecurityConfig") || src.contains("WebSecurityConfigurer") || src.contains("SecurityFilterChain")) {
                    hasSecurityConfig = true;
                }
                if (src.contains("@SpringBootApplication") || src.contains("@EnableAutoConfiguration")) {
                    var m = Pattern.compile("^package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE).matcher(src);
                    if (m.find()) mainAppPackage = m.group(1);
                }
            }
        }

        if (!needsSecurity) return;

        if (!hasSecurityDep) {
            String dep = """
                        <dependency>
                            <groupId>org.springframework.boot</groupId>
                            <artifactId>spring-boot-starter-security</artifactId>
                        </dependency>
                    """;
            pomContent = pomContent.replace("</dependencies>", dep + "\n    </dependencies>");
            Files.writeString(pomPath, pomContent);
            emitLog(projectId, "[SYSTEM] Auto-injected spring-boot-starter-security into pom.xml (detected Spring Security imports in source files).");
        }

        if (!hasSecurityConfig && mainAppPackage != null) {
            String configPkg = mainAppPackage + ".config";
            String configDir = configPkg.replace('.', '/');
            Path configPath = projectDir.resolve("src/main/java/" + configDir + "/SecurityConfig.java");
            if (Files.notExists(configPath.getParent())) {
                Files.createDirectories(configPath.getParent());
            }

            String securityConfig = """
                    package %s;

                    import org.springframework.context.annotation.Bean;
                    import org.springframework.context.annotation.Configuration;
                    import org.springframework.security.config.annotation.web.builders.HttpSecurity;
                    import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
                    import org.springframework.security.web.SecurityFilterChain;

                    @Configuration
                    @EnableWebSecurity
                    public class SecurityConfig {

                        @Bean
                        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                            http
                                .csrf(csrf -> csrf.disable())
                                .authorizeHttpRequests(auth -> auth
                                    .requestMatchers("/**").permitAll()
                                )
                                .formLogin(form -> form.disable())
                                .httpBasic(basic -> basic.disable());
                            return http.build();
                        }
                    }
                    """.formatted(configPkg);

            Files.writeString(configPath, securityConfig);
            emitLog(projectId, "[SYSTEM] Created SecurityConfig.java to disable default auth (sandbox mode).");
        }
    }

    private void fixMissingJavaImports(String projectId, Path projectDir) throws IOException {
        Map<String, String> commonImports = new LinkedHashMap<>();
        commonImports.put("UUID", "java.util.UUID");
        commonImports.put("List", "java.util.List");
        commonImports.put("Map", "java.util.Map");
        commonImports.put("HashMap", "java.util.HashMap");
        commonImports.put("ArrayList", "java.util.ArrayList");
        commonImports.put("Optional", "java.util.Optional");
        commonImports.put("Set", "java.util.Set");
        commonImports.put("HashSet", "java.util.HashSet");
        commonImports.put("Arrays", "java.util.Arrays");
        commonImports.put("Collections", "java.util.Collections");
        commonImports.put("Date", "java.util.Date");
        commonImports.put("LocalDate", "java.time.LocalDate");
        commonImports.put("LocalDateTime", "java.time.LocalDateTime");
        commonImports.put("BigDecimal", "java.math.BigDecimal");
        commonImports.put("Stream", "java.util.stream.Stream");
        commonImports.put("Collectors", "java.util.stream.Collectors");
        commonImports.put("Path", "java.nio.file.Path");
        commonImports.put("Paths", "java.nio.file.Paths");
        commonImports.put("Files", "java.nio.file.Files");

        try (var files = Files.walk(projectDir)) {
            files.filter(p -> p.toString().endsWith(".java")).forEach(javaFile -> {
                try {
                    String content = Files.readString(javaFile);
                    String packageName = extractPackage(content);
                    Set<String> existingImports = extractImports(content);
                    Set<String> importsToAdd = new LinkedHashSet<>();

                    for (var entry : commonImports.entrySet()) {
                        String typeName = entry.getKey();
                        String fullImport = entry.getValue();
                        String importClassName = fullImport.substring(fullImport.lastIndexOf('.') + 1);

                        if (existingImports.contains(fullImport)
                            || existingImports.contains(importClassName)
                            || existingImports.contains(fullImport.substring(0, fullImport.lastIndexOf('.')) + ".*")) {
                            continue;
                        }

                        if (packageName != null && fullImport.startsWith(packageName)) continue;

                        if (Pattern.compile("(?<![\\w.])" + Pattern.quote(typeName) + "(?![\\w.])").matcher(content).find()) {
                            importsToAdd.add(fullImport);
                        }
                    }

                    if (!importsToAdd.isEmpty()) {
                        StringBuilder updated = new StringBuilder();
                        String[] lines = content.split("\n", -1);
                        int insertAfter = -1;

                        for (int i = 0; i < lines.length; i++) {
                            String line = lines[i];
                            if (line.startsWith("import ")) {
                                insertAfter = i;
                            }
                        }

                        if (insertAfter >= 0) {
                            for (int i = 0; i <= insertAfter; i++) {
                                updated.append(lines[i]).append("\n");
                            }
                            for (String imp : importsToAdd) {
                                updated.append("import ").append(imp).append(";\n");
                            }
                            for (int i = insertAfter + 1; i < lines.length; i++) {
                                updated.append(lines[i]).append(i < lines.length - 1 ? "\n" : "");
                            }
                        } else {
                            int packageEnd = -1;
                            for (int i = 0; i < lines.length; i++) {
                                if (lines[i].startsWith("package ")) {
                                    packageEnd = i;
                                    break;
                                }
                            }
                            if (packageEnd >= 0) {
                                for (int i = 0; i <= packageEnd; i++) {
                                    updated.append(lines[i]).append("\n");
                                }
                                updated.append("\n");
                                for (String imp : importsToAdd) {
                                    updated.append("import ").append(imp).append(";\n");
                                }
                                updated.append("\n");
                                for (int i = packageEnd + 1; i < lines.length; i++) {
                                    updated.append(lines[i]).append(i < lines.length - 1 ? "\n" : "");
                                }
                            }
                        }

                        if (!updated.isEmpty()) {
                            Files.writeString(javaFile, updated.toString());
                            emitLog(projectId, "[SYSTEM] Added missing imports to " + projectDirRelativeName(javaFile) + ": " + String.join(", ", importsToAdd) + ".");
                        }
                    }
                } catch (IOException e) {
                    log.warn("Failed to fix imports in {}", javaFile, e);
                }
            });
        }
    }

    private String extractPackage(String content) {
        var matcher = Pattern.compile("^package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE).matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }

    private Set<String> extractImports(String content) {
        Set<String> imports = new LinkedHashSet<>();
        var matcher = Pattern.compile("^import\\s+(?:static\\s+)?([\\w.*]+)\\s*;", Pattern.MULTILINE).matcher(content);
        while (matcher.find()) {
            imports.add(matcher.group(1));
        }
        return imports;
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

    private record DbService(String engine, String serviceName, String database, String username, String password) {
        private String jdbcUrl() {
            if (engine.equals("postgres")) {
                return "jdbc:postgresql://" + serviceName + ":5432/" + database;
            }
            return "jdbc:mysql://" + serviceName + ":3306/" + database
                + "?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=false";
        }

        private String driverClassName() {
            return engine.equals("postgres") ? "org.postgresql.Driver" : "com.mysql.cj.jdbc.Driver";
        }

        private String hibernateDialect() {
            return engine.equals("postgres")
                ? "org.hibernate.dialect.PostgreSQLDialect"
                : "org.hibernate.dialect.MySQLDialect";
        }
    }
}
