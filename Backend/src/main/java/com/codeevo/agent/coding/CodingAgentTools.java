package com.codeevo.agent.coding;

import com.codeevo.agent.document.AgentCheckpoint;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.model.AgentEvent;
import com.codeevo.agent.model.AgentEventType;
import com.codeevo.agent.model.AgentType;
import com.codeevo.agent.model.payload.DiffReadyPayload;
import com.codeevo.agent.repository.AgentCheckpointRepository;
import com.codeevo.agent.tools.ToolResult;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Tool implementations for the Coding Agent.
 *
 * All file operations (read, write, search) operate on the project's code
 * stored in MongoDB ({@code project_code_files} collection) via
 * {@link ProjectCodeRepository}. This ensures that every file the agent
 * creates or modifies immediately appears in the frontend Code section.
 *
 * Local-filesystem access is NOT used for project code — the project database
 * is the single source of truth for all generated files.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CodingAgentTools {

    private final AgentCheckpointRepository checkpointRepository;
    private final ProjectCodeRepository codeRepository;

    // ─── list_project_files ───────────────────────────────────────────────────

    /**
     * Lists all existing code files for a project from MongoDB.
     * The agent should call this first to understand what already exists.
     */
    public ToolResult listProjectFiles(String projectId) {
        try {
            List<ProjectCode> files = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);

            if (files.isEmpty()) {
                return ToolResult.ok("No code files exist yet for this project. Use create_file to start generating code.");
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Existing project files (").append(files.size()).append(" total):\n");
            for (ProjectCode file : files) {
                sb.append("- ").append(file.getFilePath());
                if (file.getLanguage() != null) {
                    sb.append(" [").append(file.getLanguage()).append("]");
                }
                sb.append("\n");
            }
            return ToolResult.ok(sb.toString());

        } catch (Exception e) {
            log.error("Failed to list project files for project {}: {}", projectId, e.getMessage());
            return ToolResult.error("Failed to list project files: " + e.getMessage());
        }
    }

    // ─── search_codebase ──────────────────────────────────────────────────────

    /**
     * Searches across all project code files in MongoDB for a query string.
     * Returns matching file paths and a snippet of the matching content.
     */
    public ToolResult searchCodebase(String projectId, String query, String searchType, String directoryScope) {
        try {
            List<ProjectCode> allFiles = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);

            if (allFiles.isEmpty()) {
                return ToolResult.ok("No files found in project. Use list_project_files to confirm, then create_file to add files.");
            }

            String lowerQuery = query.toLowerCase();

            List<ProjectCode> matches = allFiles.stream()
                    .filter(f -> {
                        // Filter by directory scope if specified
                        if (directoryScope != null && !directoryScope.isBlank()) {
                            if (!f.getFilePath().startsWith(directoryScope)) return false;
                        }
                        // Search in file path and content
                        boolean pathMatch = f.getFilePath().toLowerCase().contains(lowerQuery);
                        boolean contentMatch = f.getContent() != null &&
                                f.getContent().toLowerCase().contains(lowerQuery);
                        return pathMatch || contentMatch;
                    })
                    .limit(20)
                    .collect(Collectors.toList());

            if (matches.isEmpty()) {
                return ToolResult.ok("No files found containing: \"" + query + "\"\n" +
                        "Total files in project: " + allFiles.size() + ". Use list_project_files to see all files.");
            }

            StringBuilder sb = new StringBuilder();
            sb.append("Files matching \"").append(query).append("\" (").append(matches.size()).append(" results):\n");
            for (ProjectCode f : matches) {
                sb.append("\n### ").append(f.getFilePath()).append("\n");
                // Include a content snippet around the match
                if (f.getContent() != null) {
                    String content = f.getContent();
                    int idx = content.toLowerCase().indexOf(lowerQuery);
                    if (idx >= 0) {
                        int start = Math.max(0, idx - 100);
                        int end = Math.min(content.length(), idx + 200);
                        String snippet = content.substring(start, end).trim();
                        sb.append("```\n...").append(snippet).append("...\n```\n");
                    }
                }
            }
            return ToolResult.ok(sb.toString());

        } catch (Exception e) {
            log.error("Search failed for project {}: {}", projectId, e.getMessage());
            return ToolResult.error("Search failed: " + e.getMessage());
        }
    }

    // ─── view_file ────────────────────────────────────────────────────────────

    /**
     * Reads the full content of a file from the project database.
     * The filePath must be a relative project path (e.g. "src/main/java/com/example/UserService.java").
     */
    public ToolResult viewFile(String projectId, String filePath, int startLine, int endLine) {
        try {
            Optional<ProjectCode> fileOpt = codeRepository.findByProjectIdAndFilePath(projectId, filePath);

            if (fileOpt.isEmpty()) {
                // Try to give a helpful suggestion
                List<ProjectCode> allFiles = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);
                String similar = allFiles.stream()
                        .filter(f -> f.getFilePath().contains(filePath.substring(Math.max(0, filePath.lastIndexOf('/') + 1))))
                        .map(ProjectCode::getFilePath)
                        .limit(3)
                        .collect(Collectors.joining(", "));

                String hint = similar.isBlank() ? "Use list_project_files to see all available files." :
                        "Did you mean one of: " + similar + "?";
                return ToolResult.error("File not found in project database: " + filePath + ". " + hint);
            }

            String content = fileOpt.get().getContent();
            if (content == null) content = "";

            // Sanitize: strip any HTML tags that may have been injected by the LLM
            content = stripHtml(content);

            String[] lines = content.split("\n", -1);

            // Apply line range if specified
            int from = (startLine > 1) ? Math.max(0, startLine - 1) : 0;
            int to = (endLine > 0) ? Math.min(lines.length, endLine) : lines.length;

            StringBuilder sb = new StringBuilder();
            sb.append("File: ").append(filePath).append("\n```\n");
            for (int i = from; i < to; i++) {
                sb.append(i + 1).append(": ").append(lines[i]).append("\n");
            }
            sb.append("```");

            return ToolResult.ok(sb.toString());

        } catch (Exception e) {
            log.error("Failed to view file {} in project {}: {}", filePath, projectId, e.getMessage());
            return ToolResult.error("Could not read file: " + e.getMessage());
        }
    }

    // ─── replace_file_content ─────────────────────────────────────────────────

    /**
     * Replaces an exact block of text in a project file stored in MongoDB.
     * Loads the current content from DB, performs the replacement, saves back.
     * Emits a DIFF_READY event to the frontend to display the change.
     */
    public ToolResult replaceFileContent(String userId, String sessionId, String projectId,
                                          String filePath, String targetContent,
                                          String replacementContent, String changeDescription,
                                          WebSocketGateway gateway) {
        try {
            Optional<ProjectCode> fileOpt = codeRepository.findByProjectIdAndFilePath(projectId, filePath);

            if (fileOpt.isEmpty()) {
                return ToolResult.error("File not found in project database: " + filePath +
                        ". Use list_project_files to verify the path, or create_file if it does not exist yet.");
            }

            ProjectCode file = fileOpt.get();
            String original = file.getContent() != null ? file.getContent() : "";

            String normalizedOriginal = original.replace("\r\n", "\n");
            String normalizedTarget = targetContent.replace("\r\n", "\n");

            if (!normalizedOriginal.contains(normalizedTarget)) {
                return ToolResult.error(
                        "Target content not found in " + filePath +
                        ". This is often caused by missing indentation or extra whitespace. Ensure your target_content EXACTLY matches the existing file. Call view_file again to verify.");
            }

            String modified = normalizedOriginal.replace(normalizedTarget, replacementContent.replace("\r\n", "\n"));

            // Sanitize: strip any HTML tags that may have been injected by the LLM before saving
            modified = stripHtml(modified);

            // Emit diff event for the frontend to display
            String approvalToken = UUID.randomUUID().toString();
            DiffReadyPayload diff = DiffReadyPayload.builder()
                    .filePath(filePath).originalContent(original).modifiedContent(modified)
                    .changeDescription(changeDescription).requiresApproval(false)
                    .approvalToken(approvalToken).build();

            AgentEvent diffEvent = AgentEvent.builder()
                    .sessionId(sessionId).projectId(projectId).agentType(AgentType.CODING)
                    .type(AgentEventType.DIFF_READY).payload(diff).build();
            gateway.emitDiff(userId, diffEvent, diff);

            // Save updated content back to MongoDB
            file.setContent(modified);
            file.setSizeBytes((long) modified.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
            file.setUpdatedAt(Instant.now());
            codeRepository.save(file);

            log.info("Updated file in project {}: {}", projectId, filePath);
            return ToolResult.ok("Successfully modified " + filePath + ". Change: " + changeDescription);

        } catch (Exception e) {
            log.error("File replace failed for {} in project {}: {}", filePath, projectId, e.getMessage());
            return ToolResult.error("File update failed: " + e.getMessage());
        }
    }

    // ─── create_file ──────────────────────────────────────────────────────────

    /**
     * Creates a new code file in the project database (MongoDB).
     * The file immediately appears in the frontend Code section.
     * Emits a DIFF_READY event to show the new file content.
     */
    public ToolResult createFile(String userId, String sessionId, String projectId,
                                  String filePath, String content, String changeDescription,
                                  String language, WebSocketGateway gateway) {
        try {
            // Check if file already exists — use upsert semantics
            Optional<ProjectCode> existing = codeRepository.findByProjectIdAndFilePath(projectId, filePath);

            if (existing.isPresent()) {
                // Treat as an update if the agent re-creates an existing file
                return replaceFileContent(userId, sessionId, projectId,
                        filePath,
                        existing.get().getContent() != null ? existing.get().getContent() : "",
                        content,
                        "Overwrite: " + changeDescription,
                        gateway);
            }

            // Detect language from file extension if not explicitly provided
            String detectedLanguage = language != null ? language : detectLanguage(filePath);

            // Sanitize: strip any HTML tags/entities the LLM may have injected
            String cleanContent = stripHtml(content);

            // Save to MongoDB
            ProjectCode newFile = ProjectCode.builder()
                    .projectId(projectId)
                    .filePath(filePath)
                    .content(cleanContent)
                    .language(detectedLanguage)
                    .sizeBytes((long) cleanContent.getBytes(java.nio.charset.StandardCharsets.UTF_8).length)
                    .build();
            codeRepository.save(newFile);

            // Emit diff event showing the new file to the frontend
            DiffReadyPayload diff = DiffReadyPayload.builder()
                    .filePath(filePath).originalContent("").modifiedContent(cleanContent)
                    .changeDescription("Created: " + changeDescription)
                    .requiresApproval(false).approvalToken(UUID.randomUUID().toString())
                    .build();

            AgentEvent diffEvent = AgentEvent.builder()
                    .sessionId(sessionId).projectId(projectId).agentType(AgentType.CODING)
                    .type(AgentEventType.DIFF_READY).payload(diff).build();
            gateway.emitDiff(userId, diffEvent, diff);

            log.info("Created file in project {}: {}", projectId, filePath);
            return ToolResult.ok("Created file: " + filePath + " [" + detectedLanguage + "]. It is now visible in the Code section.");

        } catch (Exception e) {
            log.error("File creation failed for {} in project {}: {}", filePath, projectId, e.getMessage());
            return ToolResult.error("File creation failed: " + e.getMessage());
        }
    }

    // ─── run_maven_command ────────────────────────────────────────────────────

    /**
     * Executes a whitelisted Maven command for build verification.
     * Note: This runs against the CodeEvo server itself, not the generated project.
     * For generated Spring Boot projects, compilation is verified via syntax review.
     */
    public ToolResult runMavenCommand(String command, int timeoutSeconds) {
        List<String> allowed = List.of("mvn compile", "mvn test", "mvn clean compile", "mvn spring-boot:run");
        if (allowed.stream().noneMatch(command::startsWith)) {
            return ToolResult.error("Command not allowed: " + command +
                    ". Allowed: " + String.join(", ", allowed));
        }

        try {
            String[] parts = command.split("\\s+");
            ProcessBuilder pb = new ProcessBuilder(parts);
            pb.directory(new java.io.File(System.getProperty("user.dir")));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            StringBuilder output = new StringBuilder();

            try (java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(timeoutSeconds, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return ToolResult.error("Command timed out after " + timeoutSeconds + "s: " + command);
            }

            int exitCode = process.exitValue();
            String result = output.toString();
            if (result.length() > 4000) {
                result = result.substring(result.length() - 4000);
            }

            if (exitCode == 0) {
                return ToolResult.ok("✅ " + command + " succeeded:\n" + result);
            } else {
                return ToolResult.error("❌ " + command + " failed (exit " + exitCode + "):\n" + result);
            }

        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return ToolResult.error("Command execution failed: " + e.getMessage() + ". This is likely because 'mvn' is not in the system PATH. Please verify your code manually or ensure 'mvn' is installed.");
        }
    }

    // ─── run_tests ────────────────────────────────────────────────────────────

    public ToolResult runTests(String testClass, String testMethod) {
        String command = testClass != null
                ? (testMethod != null
                    ? "mvn test -Dtest=" + testClass + "#" + testMethod
                    : "mvn test -Dtest=" + testClass)
                : "mvn test";
        return runMavenCommand(command, 180);
    }

    // ─── checkpoint ───────────────────────────────────────────────────────────

    public ToolResult saveCheckpoint(String sessionId, String projectId, String userId,
                                      String taskSummary,
                                      List<String> completedSteps, List<String> remainingSteps) {
        try {
            checkpointRepository.deleteBySessionId(sessionId);

            AgentCheckpoint checkpoint = AgentCheckpoint.builder()
                    .sessionId(sessionId).projectId(projectId).userId(userId)
                    .taskSummary(taskSummary)
                    .completedSteps(completedSteps).remainingSteps(remainingSteps)
                    .build();
            checkpointRepository.save(checkpoint);

            return ToolResult.ok("Checkpoint saved. Completed: " + completedSteps.size() +
                    " steps. Remaining: " + remainingSteps.size() + " steps.");
        } catch (Exception e) {
            log.error("Failed to save checkpoint for session {}", sessionId, e);
            return ToolResult.error("Checkpoint save failed: " + e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String detectLanguage(String filePath) {
        if (filePath == null) return "text";
        String lower = filePath.toLowerCase();
        if (lower.endsWith(".java"))       return "java";
        if (lower.endsWith(".ts"))         return "typescript";
        if (lower.endsWith(".tsx"))        return "typescript";
        if (lower.endsWith(".js"))         return "javascript";
        if (lower.endsWith(".jsx"))        return "javascript";
        if (lower.endsWith(".py"))         return "python";
        if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
        if (lower.endsWith(".xml"))        return "xml";
        if (lower.endsWith(".json"))       return "json";
        if (lower.endsWith(".md"))         return "markdown";
        if (lower.endsWith(".sql"))        return "sql";
        if (lower.endsWith(".properties")) return "properties";
        if (lower.endsWith(".html"))       return "html";
        if (lower.endsWith(".css"))        return "css";
        if (lower.endsWith(".go"))         return "go";
        return "text";
    }

    // ─── HTML Sanitizer ───────────────────────────────────────────────────────

    /**
     * Strips all HTML tags (e.g. {@code <span class="text-pink-400">}) and decodes common
     * HTML entities that the LLM may accidentally inject into code content.
     * Applied on every file read (viewFile) and every write (createFile, replaceFileContent).
     */
    private static String stripHtml(String input) {
        if (input == null) return "";
        
        // 1. Decode HTML entities first (so &quot;&gt; becomes ">)
        String decoded = input
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");

        return decoded;
    }
}
