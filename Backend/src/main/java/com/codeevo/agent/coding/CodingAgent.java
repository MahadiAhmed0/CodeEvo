package com.codeevo.agent.coding;

import com.codeevo.agent.config.AgentModelProperties;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.llm.LlmResponse;
import com.codeevo.agent.llm.LlmToolCall;
import com.codeevo.agent.model.*;
import com.codeevo.agent.model.payload.ToolCallPayload;
import com.codeevo.agent.prompt.SystemPrompts;
import com.codeevo.agent.tools.ToolRegistry;
import com.codeevo.agent.tools.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agent 3: Coding Agent (Execution Engine)
 *
 * The backend execution engine. Reads code, writes code, runs builds.
 * Never converses with the user — only emits progress + diff events.
 *
 * Key safety features:
 * - Self-corrects up to maxRetries times on build failure before asking user
 * - Emits DIFF_READY events requiring user approval before writing any file
 * - Saves checkpoints after every successful file modification
 * - Wipes scratchpad after task completion
 */
@Slf4j
@Service
public class CodingAgent {

    private final LlmClient llmClient;
    private final ToolRegistry toolRegistry;
    private final WebSocketGateway gateway;
    private final CodingAgentTools tools;
    private final AgentModelProperties props;
    private final ObjectMapper objectMapper;

    /** Pending user approvals: approvalToken → CompletableFuture<UserFeedback> */
    private final ConcurrentHashMap<String, CompletableFuture<UserFeedback>> pendingApprovals =
            new ConcurrentHashMap<>();

    /** Tracks last progress message per session to suppress duplicate spam */
    private final ConcurrentHashMap<String, String> lastProgressMessage = new ConcurrentHashMap<>();

    /** Tracks files created per session for result reporting */
    private final ConcurrentHashMap<String, List<String>> sessionFilesCreated = new ConcurrentHashMap<>();
    /** Tracks files modified per session for result reporting */
    private final ConcurrentHashMap<String, List<String>> sessionFilesModified = new ConcurrentHashMap<>();

    public CodingAgent(
            @Qualifier("codingLlmClient") LlmClient llmClient,
            ToolRegistry toolRegistry,
            WebSocketGateway gateway,
            CodingAgentTools tools,
            AgentModelProperties props,
            ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.gateway = gateway;
        this.tools = tools;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /**
     * Run the Coding Agent agentic loop for a coding task.
     * Executed asynchronously by the Supervisor's thread pool.
     */
    public CodingTaskResult run(String userId, CodingTask task, String projectName, String diagramJson) {
        String sessionId = task.getSessionId();
        String projectId = task.getProjectId();
        int maxRetries = props.getCoding().getMaxSelfCorrectionAttempts();

        sessionFilesCreated.put(sessionId, new ArrayList<>());
        sessionFilesModified.put(sessionId, new ArrayList<>());

        gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                props.getCoding().getName() + " activated. Analyzing task...", "RUNNING"));

        // Build the scratchpad — this is the working memory for this entire task
        List<LlmMessage> scratchpad = new ArrayList<>();
        scratchpad.add(LlmMessage.system(SystemPrompts.codingAgent(projectName, maxRetries, diagramJson)));
        scratchpad.add(LlmMessage.user(buildTaskPrompt(task, diagramJson)));

        int consecutiveErrors = 0;
        int iterations = 0;
        int maxIterations = 100; // Safety cap for long tasks
        boolean wroteCode = false;
        boolean requiresCodeWrite = requiresCodeWrite(task);

        while (iterations++ < maxIterations) {
            LlmResponse response = llmClient.chat(scratchpad, toolRegistry.getCodingTools());

            if (response.getStopReason() == LlmResponse.StopReason.ERROR) {
                consecutiveErrors++;
                if (consecutiveErrors >= maxRetries) {
                    gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CODING,
                            "LLM API failed after " + maxRetries + " attempts: " + response.getTextContent(), true));
                    cleanSession(sessionId);
                    return CodingTaskResult.builder().success(false).sessionId(sessionId).projectId(projectId)
                            .error("LLM API failed after " + maxRetries + " attempts").build();
                }
                // Add error to scratchpad and retry
                scratchpad.add(LlmMessage.user("The previous request failed with: " +
                        response.getTextContent() + ". Please try again."));
                continue;
            }

            consecutiveErrors = 0;

            // Emit reasoning thoughts
            if (response.getTextContent() != null && !response.getTextContent().isBlank()) {
                gateway.emit(userId, AgentEvent.thought(sessionId, projectId, AgentType.CODING,
                        response.getTextContent()));
            }

            if (response.isEndTurn()) {
                if (requiresCodeWrite && !wroteCode) {
                    gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                            "The model tried to finish without writing code. Continuing implementation...",
                            "WARNING"));
                    scratchpad.add(LlmMessage.assistant(response.getTextContent() != null
                            ? response.getTextContent()
                            : "I attempted to finish without writing files."));
                    scratchpad.add(LlmMessage.user("""
                            This task is not complete because no project code files were created or modified.
                            Continue now and write the required implementation files using create_file or replace_file_content.
                            If the project has no files yet, create the runnable monolith files first: pom.xml,
                            application class, application.yml, requested domain/controller/service/model/repository/DTO files,
                            Dockerfile, docker-compose.yml, and .dockerignore as required by the graph.
                            """));
                    continue;
                }
                gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                        "✅ Task complete", "SUCCESS"));
                gateway.emit(userId, AgentEvent.taskComplete(sessionId, projectId, AgentType.CODING));
                // Wipe scratchpad — task is done
                scratchpad.clear();
                cleanSession(sessionId);
                return CodingTaskResult.builder().success(true).sessionId(sessionId).projectId(projectId)
                        .filesCreated(sessionFilesCreated.getOrDefault(sessionId, List.of()))
                        .filesModified(sessionFilesModified.getOrDefault(sessionId, List.of()))
                        .summary("Task completed successfully").build();
            }

            if (response.isToolUse()) {
                scratchpad.add(LlmMessage.assistantWithTools(response.getToolCalls()));

                for (LlmToolCall toolCall : response.getToolCalls()) {
                    gateway.emit(userId, toolCallEvent(sessionId, projectId, toolCall, "RUNNING"));

                    ToolResult result = dispatchTool(toolCall, userId, task);
                    if (result.isSuccess() && isWriteTool(toolCall.getName())) {
                        wroteCode = true;
                    }
                    if (result.isSuccess()) {
                        String filePath = toolCall.getArguments().path("file_path").asText(null);
                        if (filePath != null) {
                            if ("create_file".equals(toolCall.getName())) {
                                sessionFilesCreated.get(sessionId).add(filePath);
                            } else if ("replace_file_content".equals(toolCall.getName())) {
                                sessionFilesModified.get(sessionId).add(filePath);
                            }
                        }
                    }

                    gateway.emit(userId, toolResultEvent(sessionId, projectId, toolCall, result));
                    scratchpad.add(LlmMessage.toolResult(toolCall.getId(), result.toToolMessageContent()));
                    if (!result.isSuccess() && "replace_file_content".equals(toolCall.getName())) {
                        scratchpad.add(LlmMessage.user("""
                                replace_file_content failed. Do not retry the same exact replacement.
                                Use view_file once to read the current file. If the fix is larger than a tiny exact block,
                                call create_file with the complete corrected file content to overwrite the existing file.
                                """));
                    }

                    // ask_user pauses the loop — we wait for feedback
                    if (toolCall.getName().equals("ask_user")) {
                        cleanSession(sessionId);
                        return CodingTaskResult.builder().success(false).sessionId(sessionId).projectId(projectId)
                                .summary("Task paused — awaiting user response").build();
                    }
                }
            }
        }

        log.warn("Coding agent hit max iterations for session {}", sessionId);
        gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CODING,
                "Task exceeded maximum steps. Please break it into smaller tasks.", false));
        cleanSession(sessionId);
        return CodingTaskResult.builder().success(false).sessionId(sessionId).projectId(projectId)
                .error("Task exceeded maximum steps").build();
    }

    /**
     * Called by the Supervisor when the user resumes a paused task after ask_user.
     */
    public CodingTaskResult resumeWithFeedback(String userId, CodingTask task, String projectName, String diagramJson, String userResponse) {
        return run(userId, CodingTask.builder()
                .sessionId(task.getSessionId())
                .projectId(task.getProjectId())
                .userId(task.getUserId())
                .taskSummary(task.getTaskSummary() + "\n\nUser response: " + userResponse)
                .targetFiles(task.getTargetFiles())
                .acceptanceCriteria(task.getAcceptanceCriteria())
                .build(), projectName, diagramJson);
    }

    // ─── Tool Dispatch ────────────────────────────────────────────────────────

    private ToolResult dispatchTool(LlmToolCall toolCall, String userId, CodingTask task) {
        String sessionId = task.getSessionId();
        String projectId = task.getProjectId();
        var args = toolCall.getArguments();

        return switch (toolCall.getName()) {
            case "list_project_files" -> tools.listProjectFiles(projectId);

            case "search_codebase" -> tools.searchCodebase(
                    projectId,
                    args.path("query").asText(),
                    args.path("search_type").asText("string_literal"),
                    args.path("directory_scope").asText(null));

            case "view_file" -> tools.viewFile(
                    projectId,
                    args.path("file_path").asText(),
                    args.path("start_line").asInt(1),
                    args.path("end_line").asInt(-1));

            case "replace_file_content" -> tools.replaceFileContent(
                    userId, sessionId, projectId,
                    args.path("file_path").asText(),
                    args.path("target_content").asText(),
                    args.path("replacement_content").asText(),
                    args.path("change_description").asText(""),
                    gateway);

            case "create_file" -> tools.createFile(
                    userId, sessionId, projectId,
                    args.path("file_path").asText(),
                    args.path("content").asText(),
                    args.path("change_description").asText(""),
                    args.path("language").asText(null),
                    gateway);

            case "delete_file" -> ToolResult.error(
                    "delete_file requires explicit user approval. Call ask_user first.");

            case "run_maven_command" -> tools.runMavenCommand(
                    args.path("command").asText("mvn compile"),
                    args.path("timeout_seconds").asInt(120));

            case "run_tests" -> tools.runTests(
                    args.path("test_class").asText(null),
                    args.path("test_method").asText(null));

            case "emit_progress" -> {
                String msg = args.path("message").asText();
                String last = lastProgressMessage.get(sessionId);
                if (msg.equals(last)) {
                    yield ToolResult.ok("Suppressed duplicate progress.");
                }
                lastProgressMessage.put(sessionId, msg);
                gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                        msg,
                        args.path("status").asText("RUNNING")));
                yield ToolResult.ok("Progress emitted.");
            }

            case "ask_user" -> {
                String question = args.path("question").asText();
                String context = args.path("context").asText("");
                String fullMsg = "❓ **" + question + "**\n\n_Context: " + context + "_";
                gateway.emit(userId, AgentEvent.message(sessionId, projectId, AgentType.CODING, fullMsg));
                yield ToolResult.ok("Question sent to user. Task paused pending response.");
            }

            case "checkpoint" -> tools.saveCheckpoint(
                    sessionId, projectId, task.getUserId(),
                    task.getTaskSummary(),
                    parseList(args.path("completed_steps")),
                    parseList(args.path("remaining_steps")));

            default -> ToolResult.error("Unknown coding tool: " + toolCall.getName());
        };
    }


    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String buildTaskPrompt(CodingTask task, String diagramJson) {
        StringBuilder sb = new StringBuilder();
        sb.append("## Task\n").append(task.getTaskSummary()).append("\n\n");
        sb.append(buildGraphImplementationBrief(diagramJson, task.getTaskSummary()));
        if (task.getTargetFiles() != null && !task.getTargetFiles().isEmpty()) {
            sb.append("## Target Files (likely involved)\n");
            task.getTargetFiles().forEach(f -> sb.append("- ").append(f).append("\n"));
            sb.append("\n");
        }
        if (task.getAcceptanceCriteria() != null && !task.getAcceptanceCriteria().isEmpty()) {
            sb.append("## Acceptance Criteria\n");
            task.getAcceptanceCriteria().forEach(c -> sb.append("- ").append(c).append("\n"));
        }
        return sb.toString();
    }

    private String buildGraphImplementationBrief(String diagramJson, String taskSummary) {
        if (diagramJson == null || diagramJson.isBlank()) {
            return "## Graph Implementation Brief\nNo diagram JSON is available for this task.\n\n";
        }

        try {
            JsonNode root = objectMapper.readTree(diagramJson);
            JsonNode nodes = root.path("nodes");
            JsonNode edges = root.path("edges");
            if (!nodes.isArray()) {
                return "## Graph Implementation Brief\nDiagram JSON has no nodes array.\n\n";
            }

            Map<String, JsonNode> nodeById = new LinkedHashMap<>();
            List<JsonNode> serviceNodes = new ArrayList<>();
            JsonNode gatewayNode = null;

            for (JsonNode node : nodes) {
                nodeById.put(node.path("id").asText(), node);
                String type = node.path("data").path("type").asText();
                if ("api".equals(type)) {
                    gatewayNode = node;
                } else if ("service".equals(type)) {
                    serviceNodes.add(node);
                }
            }

            List<JsonNode> selectedServices = selectServicesForTask(serviceNodes, taskSummary);
            StringBuilder sb = new StringBuilder("## Graph Implementation Brief\n");
            sb.append("Source: current Project.diagramJson. Follow this brief over generic assumptions.\n");
            sb.append("Architecture mode: single Spring Boot monolith behind MainGateway. Service nodes are internal domains.\n\n");

            if (gatewayNode != null) {
                JsonNode gwData = gatewayNode.path("data");
                JsonNode gwConfig = gwData.path("gatewayConfig");
                sb.append("MainGateway:\n");
                sb.append("- name: ").append(gwData.path("name").asText("MainGateway")).append("\n");
                sb.append("- graph public port: ").append(gwData.path("port").asText("8080")).append("\n");
                sb.append("- implementation language: ").append(gwConfig.path("language").asText("spring-boot")).append("\n");
                sb.append("- sandbox container port: 8080\n");
                appendGatewayRoutes(sb, gwConfig.path("routes"), selectedServices);
                sb.append("\n");
            }

            sb.append("Requested service scope:\n");
            if (selectedServices.isEmpty()) {
                sb.append("- No exact service match found in the graph. Use the task wording and existing files carefully.\n\n");
            } else {
                for (JsonNode service : selectedServices) {
                    appendServiceBrief(sb, service, nodeById, edges, gatewayNode);
                    sb.append("\n");
                }
            }

            sb.append("Global graph dependencies to consider only when connected to requested scope:\n");
            for (JsonNode node : nodes) {
                String type = node.path("data").path("type").asText();
                if ("database".equals(type) || "queue".equals(type)) {
                    sb.append("- ").append(node.path("data").path("name").asText(node.path("id").asText()))
                            .append(" (").append(type).append(")\n");
                }
            }
            sb.append("\n");
            return sb.toString();
        } catch (Exception e) {
            return "## Graph Implementation Brief\nCould not parse diagram JSON: " + e.getMessage() + "\n\n";
        }
    }

    private List<JsonNode> selectServicesForTask(List<JsonNode> serviceNodes, String taskSummary) {
        String summary = taskSummary != null ? taskSummary.toLowerCase() : "";
        String normalizedSummary = normalizeIdentifier(summary);
        boolean wholeGraph = summary.contains("whole graph")
                || summary.contains("entire architecture")
                || summary.contains("approved architecture")
                || summary.contains("full project")
                || summary.contains("all services")
                || summary.contains("generate code for this project");

        List<JsonNode> selected = new ArrayList<>();
        for (JsonNode service : serviceNodes) {
            String name = service.path("data").path("name").asText();
            String normalizedName = normalizeIdentifier(name);
            if (wholeGraph || (!name.isBlank()
                    && (summary.contains(name.toLowerCase()) || normalizedSummary.contains(normalizedName)))) {
                selected.add(service);
            }
        }
        return selected;
    }

    private String normalizeIdentifier(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private void appendGatewayRoutes(StringBuilder sb, JsonNode routes, List<JsonNode> selectedServices) {
        if (!routes.isArray()) {
            return;
        }
        sb.append("- routes:\n");
        for (JsonNode route : routes) {
            String target = route.path("targetService").asText();
            if (!selectedServices.isEmpty() && selectedServices.stream()
                    .noneMatch(s -> s.path("data").path("name").asText().equals(target))) {
                continue;
            }
            sb.append("  - ").append(route.path("pathPrefix").asText("/"))
                    .append(" -> ").append(target)
                    .append(" methods=").append(route.path("methods").toString())
                    .append(" stripPrefix=").append(route.path("stripPrefix").asBoolean(false))
                    .append("\n");
        }
    }

    private void appendServiceBrief(StringBuilder sb, JsonNode service, Map<String, JsonNode> nodeById,
                                    JsonNode edges, JsonNode gatewayNode) {
        String serviceId = service.path("id").asText();
        JsonNode data = service.path("data");
        String serviceName = data.path("name").asText(serviceId);
        sb.append("- Service domain: ").append(serviceName).append("\n");

        JsonNode methods = data.path("methods");
        if (methods.isArray() && methods.size() > 0) {
            sb.append("  methods from graph:\n");
            for (JsonNode method : methods) {
                sb.append("  - ").append(method.path("name").asText())
                        .append(" [").append(method.path("type").asText("handler")).append("] ")
                        .append(method.path("description").asText()).append("\n");
            }
        }

        if (gatewayNode != null) {
            JsonNode routes = gatewayNode.path("data").path("gatewayConfig").path("routes");
            if (routes.isArray()) {
                for (JsonNode route : routes) {
                    if (serviceName.equals(route.path("targetService").asText())) {
                        sb.append("  gateway route: ").append(route.path("pathPrefix").asText("/"))
                                .append(" methods=").append(route.path("methods").toString())
                                .append(" stripPrefix=").append(route.path("stripPrefix").asBoolean(false))
                                .append("\n");
                    }
                }
            }
        }

        if (edges.isArray()) {
            sb.append("  graph connections:\n");
            for (JsonNode edge : edges) {
                String source = edge.path("source").asText();
                String target = edge.path("target").asText();
                if (!serviceId.equals(source) && !serviceId.equals(target)) {
                    continue;
                }
                String otherId = serviceId.equals(source) ? target : source;
                JsonNode other = nodeById.get(otherId);
                if (other == null) {
                    continue;
                }
                JsonNode otherData = other.path("data");
                sb.append("  - ").append(edge.path("label").asText("CONNECTED"))
                        .append(" ").append(otherData.path("name").asText(otherId))
                        .append(" (").append(otherData.path("type").asText("unknown")).append(")");
                appendDataShape(sb, otherData);
                sb.append("\n");
            }
        }
    }

    private void appendDataShape(StringBuilder sb, JsonNode dataNode) {
        JsonNode tables = dataNode.path("tables");
        JsonNode collections = dataNode.path("collections");
        JsonNode topics = dataNode.path("topics");
        if (tables.isArray() && tables.size() > 0) {
            sb.append(" tables=").append(namedArray(tables));
        }
        if (collections.isArray() && collections.size() > 0) {
            sb.append(" collections=").append(namedArray(collections));
        }
        if (topics.isArray() && topics.size() > 0) {
            sb.append(" topics=").append(topics.toString());
        }
    }

    private String namedArray(JsonNode array) {
        List<String> names = new ArrayList<>();
        for (JsonNode item : array) {
            names.add(item.path("name").asText(item.asText()));
        }
        return names.toString();
    }

    private boolean requiresCodeWrite(CodingTask task) {
        String summary = task.getTaskSummary() != null ? task.getTaskSummary().toLowerCase() : "";
        if (summary.contains("generate")
                || summary.contains("create")
                || summary.contains("implement")
                || summary.contains("build")
                || summary.contains("write")
                || summary.contains("modify")
                || summary.contains("update")) {
            return true;
        }
        return task.getAcceptanceCriteria() != null && task.getAcceptanceCriteria().stream()
                .map(String::toLowerCase)
                .anyMatch(c -> c.contains("generated code")
                        || c.contains("runnable")
                        || c.contains("endpoint")
                        || c.contains("docker")
                        || c.contains("api tester"));
    }

    private boolean isWriteTool(String toolName) {
        return "create_file".equals(toolName) || "replace_file_content".equals(toolName);
    }

    private List<String> parseList(com.fasterxml.jackson.databind.JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) node.forEach(n -> list.add(n.asText()));
        return list;
    }

    private AgentEvent toolCallEvent(String sessionId, String projectId, LlmToolCall tc, String status) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(AgentType.CODING)
                .type(AgentEventType.TOOL_CALL)
                .payload(ToolCallPayload.builder().toolName(tc.getName()).status(status).build())
                .build();
    }

    private AgentEvent toolResultEvent(String sessionId, String projectId, LlmToolCall tc, ToolResult result) {
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(AgentType.CODING)
                .type(AgentEventType.TOOL_RESULT)
                .payload(ToolCallPayload.builder()
                        .toolName(tc.getName())
                        .status(result.isSuccess() ? "SUCCESS" : "FAILED")
                        .resultSummary(result.isSuccess() ? result.getContent() : result.getErrorMessage())
                        .build())
                .build();
    }

    private void cleanSession(String sessionId) {
        lastProgressMessage.remove(sessionId);
        sessionFilesCreated.remove(sessionId);
        sessionFilesModified.remove(sessionId);
    }
}
