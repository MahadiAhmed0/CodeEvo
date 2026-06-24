package com.codeevo.agent.architect;

import com.codeevo.agent.config.AgentModelProperties;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.llm.LlmResponse;
import com.codeevo.agent.llm.LlmToolCall;
import com.codeevo.agent.model.*;
import com.codeevo.agent.model.payload.GraphUpdatePayload;
import com.codeevo.agent.model.payload.PermissionRequestPayload;
import com.codeevo.agent.model.payload.ToolCallPayload;
import com.codeevo.agent.prompt.SystemPrompts;
import com.codeevo.agent.tools.ToolRegistry;
import com.codeevo.agent.tools.ToolResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Consumer;

/**
 * Agent 2: Visual Architect Agent
 *
 * Translates architectural intent into ReactFlow node/edge JSON for the canvas.
 * Enforces the "design first, code never without approval" principle.
 *
 * Workflow:
 * 1. Receives an ArchitectureTask from the Supervisor
 * 2. Gets current canvas state (deduplication)
 * 3. Generates ReactFlow nodes/edges and sends GRAPH_UPDATE to frontend
 * 4. Sends PERMISSION_REQ — pauses until user approves
 * 5. If approved, emits coding task back through the callback
 */
@Slf4j
@Service
public class VisualArchitectAgent {

    private final LlmClient llmClient;
    private final ToolRegistry toolRegistry;
    private final WebSocketGateway gateway;
    private final VisualArchitectTools tools;
    private final ObjectMapper objectMapper;
    private final AgentModelProperties props;

    public VisualArchitectAgent(
            @Qualifier("architectLlmClient") LlmClient llmClient,
            ToolRegistry toolRegistry,
            WebSocketGateway gateway,
            VisualArchitectTools tools,
            ObjectMapper objectMapper,
            AgentModelProperties props) {
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.gateway = gateway;
        this.tools = tools;
        this.objectMapper = objectMapper;
        this.props = props;
    }

    /**
     * Run the Visual Architect agentic loop for an architecture design task.
     *
     * @param userId           Authenticated user for STOMP routing
     * @param task             The architecture task from the Chat AI
     * @param projectName      Project display name
     * @param onCodeApproved   Callback invoked when user approves code generation
     */
    public void run(String userId, ArchitectureTask task, String projectName, String diagramJson,
                    Consumer<CodingTask> onCodeApproved) {

        gateway.emit(userId, AgentEvent.progress(task.getSessionId(), task.getProjectId(),
                AgentType.VISUAL_ARCHITECT, "Analyzing architecture request...", "RUNNING"));

        List<LlmMessage> scratchpad = new ArrayList<>();
        scratchpad.add(LlmMessage.system(SystemPrompts.visualArchitectAgent(projectName, diagramJson)));
        scratchpad.add(LlmMessage.user(buildTaskPrompt(task)));

        int iterations = 0;
        while (iterations++ < 8) {
            LlmResponse response = llmClient.chat(scratchpad, toolRegistry.getArchitectTools());

            if (response.getStopReason() == LlmResponse.StopReason.ERROR) {
                gateway.emit(userId, AgentEvent.error(task.getSessionId(), task.getProjectId(),
                        AgentType.VISUAL_ARCHITECT, "Architect LLM error: " + response.getTextContent(), false));
                return;
            }

            if (response.getTextContent() != null && !response.getTextContent().isBlank()) {
                gateway.emit(userId, AgentEvent.thought(task.getSessionId(), task.getProjectId(),
                        AgentType.VISUAL_ARCHITECT, response.getTextContent()));
            }

            if (response.isEndTurn()) {
                gateway.emit(userId, AgentEvent.taskComplete(task.getSessionId(),
                        task.getProjectId(), AgentType.VISUAL_ARCHITECT));
                return;
            }

            if (response.isToolUse()) {
                scratchpad.add(LlmMessage.assistantWithTools(response.getToolCalls()));

                for (LlmToolCall toolCall : response.getToolCalls()) {
                    gateway.emit(userId, toolCallEvent(task, toolCall, "RUNNING"));

                    ToolResult result = dispatchTool(toolCall, userId, task, onCodeApproved);

                    gateway.emit(userId, toolResultEvent(task, toolCall, result));
                    scratchpad.add(LlmMessage.toolResult(toolCall.getId(), result.toToolMessageContent()));

                    // request_code_generation_permission suspends the loop — user must respond
                    if (toolCall.getName().equals("request_code_generation_permission")) {
                        return;
                    }
                }
            }
        }
    }

    // ─── Tool Dispatch ────────────────────────────────────────────────────────

    private ToolResult dispatchTool(LlmToolCall toolCall, String userId,
                                     ArchitectureTask task,
                                     Consumer<CodingTask> onCodeApproved) {
        JsonNode args = toolCall.getArguments();
        return switch (toolCall.getName()) {
            case "get_current_canvas_state" ->
                    tools.getCurrentCanvasState(args.path("project_id").asText(task.getProjectId()));

            case "render_reactflow_graph" -> {
                List<Map<String, Object>> nodes = parseMapList(args.path("nodes"));
                List<Map<String, Object>> edges = parseMapList(args.path("edges"));
                String summary = args.path("summary").asText("");

                // Build and emit the GRAPH_UPDATE event
                String approvalToken = UUID.randomUUID().toString();
                GraphUpdatePayload graphPayload = GraphUpdatePayload.builder()
                        .nodes(nodes).edges(edges).summary(summary)
                        .approvalToken(approvalToken)
                        .permissionMessage("Review the architecture above. Approve to generate code.")
                        .build();

                AgentEvent graphEvent = AgentEvent.builder()
                        .sessionId(task.getSessionId()).projectId(task.getProjectId())
                        .agentType(AgentType.VISUAL_ARCHITECT)
                        .type(AgentEventType.GRAPH_UPDATE)
                        .payload(graphPayload)
                        .build();

                gateway.emitGraph(userId, graphEvent);

                // Also send the chat-window summary message
                gateway.emit(userId, AgentEvent.message(task.getSessionId(), task.getProjectId(),
                        AgentType.VISUAL_ARCHITECT, "📐 Architecture mapped on canvas:\n\n" + summary));

                yield ToolResult.ok("Graph rendered. Nodes: " + nodes.size() +
                        ", Edges: " + edges.size() + ". Approval token: " + approvalToken);
            }

            case "request_code_generation_permission" -> {
                String promptMessage = args.path("prompt_message").asText();
                List<String> filesToCreate = parseStringList(args.path("planned_files_to_create"));
                List<String> filesToModify = parseStringList(args.path("planned_files_to_modify"));

                String approvalToken = UUID.randomUUID().toString();
                PermissionRequestPayload permPayload = PermissionRequestPayload.builder()
                        .actionDescription(promptMessage)
                        .consequences("Will create " + filesToCreate.size() +
                                " file(s) and modify " + filesToModify.size() + " existing file(s).")
                        .approvalToken(approvalToken)
                        .plannedFilesToCreate(filesToCreate)
                        .plannedFilesToModify(filesToModify)
                        .build();

                AgentEvent permEvent = AgentEvent.builder()
                        .sessionId(task.getSessionId()).projectId(task.getProjectId())
                        .agentType(AgentType.VISUAL_ARCHITECT)
                        .type(AgentEventType.PERMISSION_REQ)
                        .payload(permPayload)
                        .build();

                gateway.emit(userId, permEvent);
                yield ToolResult.ok("Permission requested. Token: " + approvalToken +
                        ". Waiting for user approval.");
            }

            default -> ToolResult.error("Unknown architect tool: " + toolCall.getName());
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String buildTaskPrompt(ArchitectureTask task) {
        return """
                Architecture Request: %s
                
                Current System Context: %s
                
                Please design the architecture for this request. Start by getting the current canvas state,
                then render the new nodes/edges, and finally request user permission before any code generation.
                """.formatted(task.getArchitectureRequest(), task.getCurrentContextSummary());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseMapList(JsonNode node) {
        if (node == null || !node.isArray()) return new ArrayList<>();
        try {
            return objectMapper.convertValue(node, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<String> parseStringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) node.forEach(n -> list.add(n.asText()));
        return list;
    }

    private AgentEvent toolCallEvent(ArchitectureTask task, LlmToolCall tc, String status) {
        return AgentEvent.builder()
                .sessionId(task.getSessionId()).projectId(task.getProjectId())
                .agentType(AgentType.VISUAL_ARCHITECT).type(AgentEventType.TOOL_CALL)
                .payload(ToolCallPayload.builder().toolName(tc.getName()).status(status).build())
                .build();
    }

    private AgentEvent toolResultEvent(ArchitectureTask task, LlmToolCall tc, ToolResult result) {
        return AgentEvent.builder()
                .sessionId(task.getSessionId()).projectId(task.getProjectId())
                .agentType(AgentType.VISUAL_ARCHITECT).type(AgentEventType.TOOL_RESULT)
                .payload(ToolCallPayload.builder()
                        .toolName(tc.getName())
                        .status(result.isSuccess() ? "SUCCESS" : "FAILED")
                        .resultSummary(result.isSuccess() ? result.getContent() : result.getErrorMessage())
                        .build())
                .build();
    }
}
