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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

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

    /** Pending user approvals: approvalToken → CompletableFuture<UserFeedback> */
    private final ConcurrentHashMap<String, CompletableFuture<UserFeedback>> pendingApprovals =
            new ConcurrentHashMap<>();

    public CodingAgent(
            @Qualifier("codingLlmClient") LlmClient llmClient,
            ToolRegistry toolRegistry,
            WebSocketGateway gateway,
            CodingAgentTools tools,
            AgentModelProperties props) {
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.gateway = gateway;
        this.tools = tools;
        this.props = props;
    }

    /**
     * Run the Coding Agent agentic loop for a coding task.
     * Executed asynchronously by the Supervisor's thread pool.
     */
    public void run(String userId, CodingTask task, String projectName, String diagramJson) {
        String sessionId = task.getSessionId();
        String projectId = task.getProjectId();
        int maxRetries = props.getCoding().getMaxSelfCorrectionAttempts();

        gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                props.getCoding().getName() + " activated. Analyzing task...", "RUNNING"));

        // Build the scratchpad — this is the working memory for this entire task
        List<LlmMessage> scratchpad = new ArrayList<>();
        scratchpad.add(LlmMessage.system(SystemPrompts.codingAgent(projectName, maxRetries, diagramJson)));
        scratchpad.add(LlmMessage.user(buildTaskPrompt(task)));

        int consecutiveErrors = 0;
        int iterations = 0;
        int maxIterations = 100; // Safety cap for long tasks

        while (iterations++ < maxIterations) {
            LlmResponse response = llmClient.chat(scratchpad, toolRegistry.getCodingTools());

            if (response.getStopReason() == LlmResponse.StopReason.ERROR) {
                consecutiveErrors++;
                if (consecutiveErrors >= maxRetries) {
                    gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CODING,
                            "LLM API failed after " + maxRetries + " attempts: " + response.getTextContent(), true));
                    return;
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
                gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                        "✅ Task complete", "SUCCESS"));
                gateway.emit(userId, AgentEvent.taskComplete(sessionId, projectId, AgentType.CODING));
                // Wipe scratchpad — task is done
                scratchpad.clear();
                return;
            }

            if (response.isToolUse()) {
                scratchpad.add(LlmMessage.assistantWithTools(response.getToolCalls()));

                for (LlmToolCall toolCall : response.getToolCalls()) {
                    gateway.emit(userId, toolCallEvent(sessionId, projectId, toolCall, "RUNNING"));

                    ToolResult result = dispatchTool(toolCall, userId, task);

                    String status = result.isSuccess() ? "SUCCESS" : "FAILED";
                    gateway.emit(userId, toolResultEvent(sessionId, projectId, toolCall, result));
                    scratchpad.add(LlmMessage.toolResult(toolCall.getId(), result.toToolMessageContent()));

                    // ask_user pauses the loop — we wait for feedback
                    if (toolCall.getName().equals("ask_user")) {
                        return;
                    }
                }
            }
        }

        log.warn("Coding agent hit max iterations for session {}", sessionId);
        gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CODING,
                "Task exceeded maximum steps. Please break it into smaller tasks.", false));
    }

    /**
     * Called by the Supervisor when the user resumes a paused task after ask_user.
     */
    public void resumeWithFeedback(String userId, CodingTask task, String projectName, String diagramJson, String userResponse) {
        // Re-enter the loop with the user's answer appended
        run(userId, CodingTask.builder()
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
                gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CODING,
                        args.path("message").asText(),
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

    private String buildTaskPrompt(CodingTask task) {
        StringBuilder sb = new StringBuilder();
        sb.append("## Task\n").append(task.getTaskSummary()).append("\n\n");
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
}
