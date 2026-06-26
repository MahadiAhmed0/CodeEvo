package com.codeevo.agent.chat;

import com.codeevo.agent.config.AgentModelProperties;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.llm.LlmClient;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.llm.LlmResponse;
import com.codeevo.agent.llm.LlmToolCall;
import com.codeevo.agent.memory.ConversationMemoryService;
import com.codeevo.agent.model.AgentEvent;
import com.codeevo.agent.model.AgentType;
import com.codeevo.agent.model.ArchitectureTask;
import com.codeevo.agent.model.CodingTask;
import com.codeevo.agent.prompt.SystemPrompts;
import com.codeevo.agent.tools.ToolRegistry;
import com.codeevo.agent.tools.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/**
 * Agent 1: Chat AI (Router & Expert)
 *
 * Runs the agentic loop: sends conversation to LLM, dispatches tool calls,
 * accumulates results, and loops until end_turn or error.
 *
 * This agent NEVER writes code. It routes to the other agents via
 * delegate_to_coding_agent or delegate_to_visual_architect tool calls.
 */
@Slf4j
@Service
public class ChatAgent {

    private final LlmClient llmClient;
    private final ToolRegistry toolRegistry;
    private final ConversationMemoryService memoryService;
    private final WebSocketGateway gateway;
    private final ChatAgentTools tools;
    private final AgentModelProperties props;

    public ChatAgent(
            @Qualifier("chatLlmClient") LlmClient llmClient,
            ToolRegistry toolRegistry,
            ConversationMemoryService memoryService,
            WebSocketGateway gateway,
            ChatAgentTools tools,
            AgentModelProperties props) {
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.memoryService = memoryService;
        this.gateway = gateway;
        this.tools = tools;
        this.props = props;
    }

    /**
     * Process a user message through the Chat AI agentic loop.
     *
     * @param userId      The authenticated user's ID (STOMP principal)
     * @param sessionId   WebSocket session ID
     * @param projectId   Current project ID
     * @param projectName Project display name
     * @param userMessage Raw user text input
     * @param onCodingTask Callback when Chat AI decides to delegate to Coding Agent
     * @param onArchitectTask Callback when Chat AI decides to delegate to Visual Architect
     */
    public void run(String userId, String sessionId, String projectId, String projectName, String diagramJson,
                    String userMessage,
                    Consumer<CodingTask> onCodingTask,
                    Consumer<ArchitectureTask> onArchitectTask) {

        // Build conversation context from memory
        List<LlmMessage> scratchpad = new ArrayList<>();
        scratchpad.add(LlmMessage.system(SystemPrompts.chatAgent(projectName, projectId, diagramJson)));
        scratchpad.addAll(memoryService.getMessagesForPrompt(sessionId, projectId));

        // Add the new user message and save it to memory
        LlmMessage userMsg = LlmMessage.user(userMessage);
        scratchpad.add(userMsg);
        memoryService.addMessage(sessionId, projectId, userMsg);

        gateway.emit(userId, AgentEvent.progress(sessionId, projectId, AgentType.CHAT,
                "Processing your request...", "RUNNING"));

        // Agentic loop
        int iterations = 0;
        int maxIterations = 10; // Safety cap

        while (iterations++ < maxIterations) {
            log.info("[{}] ChatAgent loop iteration {}, calling LLM model={}", sessionId, iterations, props.getChat().getModel());
            LlmResponse response;
            try {
                response = llmClient.chat(scratchpad, toolRegistry.getChatTools());
            } catch (Exception e) {
                log.error("[{}] ChatAgent LLM call threw unexpected exception", sessionId, e);
                gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CHAT,
                        "LLM call failed: " + e.getMessage(), false));
                return;
            }

            if (response.getStopReason() == LlmResponse.StopReason.ERROR) {
                gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CHAT,
                        "LLM error: " + response.getTextContent(), false));
                return;
            }

            // If there's text content, show it as a thought or message
            if (response.getTextContent() != null && !response.getTextContent().isBlank()) {
                if (response.isEndTurn()) {
                    // Final response — add to memory and emit as MESSAGE
                    LlmMessage assistantMsg = LlmMessage.assistant(response.getTextContent());
                    memoryService.addMessage(sessionId, projectId, assistantMsg);
                    gateway.emit(userId, AgentEvent.message(sessionId, projectId, AgentType.CHAT,
                            response.getTextContent()));
                } else {
                    // Intermediate thought
                    gateway.emit(userId, AgentEvent.thought(sessionId, projectId, AgentType.CHAT,
                            response.getTextContent()));
                }
            }

            if (response.isEndTurn()) {
                gateway.emit(userId, AgentEvent.taskComplete(sessionId, projectId, AgentType.CHAT));
                return;
            }

            if (response.isToolUse()) {
                // Add assistant message with tool calls to scratchpad
                scratchpad.add(LlmMessage.assistantWithTools(response.getToolCalls()));

                for (LlmToolCall toolCall : response.getToolCalls()) {
                    // Emit tool call event
                    gateway.emit(userId, buildToolCallEvent(sessionId, projectId, toolCall, "RUNNING"));

                    ToolResult result = dispatchTool(toolCall, userId, sessionId, projectId, projectName, diagramJson,
                            onCodingTask, onArchitectTask);

                    // Emit tool result event
                    gateway.emit(userId, buildToolResultEvent(sessionId, projectId, toolCall, result));

                    // Add tool result to scratchpad for next LLM turn
                    scratchpad.add(LlmMessage.toolResult(toolCall.getId(), result.toToolMessageContent()));

                    // If this was a delegation tool, the loop ends here — the other agent takes over
                    if (isDelegationTool(toolCall.getName())) {
                        // FIX: Add a synthetic message to memory so the AI remembers it already handled this user intent
                        // Must be injected as a SYSTEM message so the LLM doesn't think it's supposed to parrot this back to the user
                        memoryService.addMessage(sessionId, projectId, LlmMessage.system("[History Note: The user request was successfully delegated to the " + toolCall.getName() + " agent. Await new user input.]"));
                        
                        gateway.emit(userId, AgentEvent.taskComplete(sessionId, projectId, AgentType.CHAT));
                        return;
                    }
                }
            }
        }

        log.warn("Chat agent loop hit max iterations for session {}", sessionId);
        gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.CHAT,
                "Reached maximum reasoning steps. Please try rephrasing.", false));
    }

    // ─── Tool Dispatch ────────────────────────────────────────────────────────

    private ToolResult dispatchTool(LlmToolCall toolCall, String userId, String sessionId,
                                     String projectId, String projectName, String diagramJson,
                                     Consumer<CodingTask> onCodingTask,
                                     Consumer<ArchitectureTask> onArchitectTask) {
        JsonNode args = toolCall.getArguments();
        return switch (toolCall.getName()) {
            case "search_project_context" -> tools.searchProjectContext(
                    projectId,
                    args.path("query").asText(),
                    args.path("language").asText("all"),
                    5);

            case "delegate_to_coding_agent" -> {
                String taskSummary = args.path("task_summary").asText();
                CodingTask task = CodingTask.builder()
                        .sessionId(sessionId).projectId(projectId).userId(userId)
                        .taskSummary(enrichCodingTaskSummary(taskSummary, diagramJson))
                        .targetFiles(parseStringList(args.path("target_files")))
                        .acceptanceCriteria(enrichAcceptanceCriteria(parseStringList(args.path("acceptance_criteria"))))
                        .build();
                onCodingTask.accept(task);
                yield ToolResult.ok("Coding Agent has been delegated the task. Execution in progress.");
            }

            case "delegate_to_visual_architect" -> {
                ArchitectureTask task = ArchitectureTask.builder()
                        .sessionId(sessionId).projectId(projectId).userId(userId)
                        .architectureRequest(args.path("architecture_request").asText())
                        .currentContextSummary(args.path("current_context_summary").asText())
                        .build();
                onArchitectTask.accept(task);
                yield ToolResult.ok("Visual Architect has been notified. Canvas update in progress.");
            }

            case "ask_clarification" -> {
                String question = args.path("question").asText();
                gateway.emit(userId, AgentEvent.message(sessionId, projectId, AgentType.CHAT, question));
                yield ToolResult.ok("Clarification question sent to user.");
            }

            default -> ToolResult.error("Unknown tool: " + toolCall.getName());
        };
    }

    private boolean isDelegationTool(String toolName) {
        return toolName.equals("delegate_to_coding_agent") || toolName.equals("delegate_to_visual_architect");
    }

    private String enrichCodingTaskSummary(String taskSummary, String diagramJson) {
        StringBuilder sb = new StringBuilder();
        sb.append(taskSummary != null ? taskSummary : "Generate code for the requested graph component.");
        sb.append("\n\n## Deterministic Coding Context\n");
        sb.append("- Use the current Project.diagramJson as the source of truth.\n");
        sb.append("- Generate one runnable monolith behind MainGateway; graph service nodes are internal domains, not separate deployable apps.\n");
        sb.append("- The Docker sandbox app must listen on container port 8080.\n");
        sb.append("- Generated Spring Boot controllers must be discoverable through /v3/api-docs for the API tester.\n");
        sb.append("- For a named service request, implement only that graph service plus required shared/bootstrap files.\n");
        sb.append("- For a whole-project request, implement all graph services and dependencies.\n");
        sb.append("- Current graph JSON is available in the Coding Agent system prompt and task graph brief.\n");

        if (diagramJson != null && !diagramJson.isBlank()) {
            sb.append("- Diagram JSON length: ").append(diagramJson.length()).append(" characters.\n");
        }
        return sb.toString();
    }

    private List<String> enrichAcceptanceCriteria(List<String> criteria) {
        List<String> enriched = new ArrayList<>();
        if (criteria != null) {
            enriched.addAll(criteria);
        }
        enriched.add("Generated code follows the current graph JSON: MainGateway routes, service methods, connected databases, queues, and external APIs.");
        enriched.add("Generated project is one runnable monolith, not one deployable service per graph service node.");
        enriched.add("Docker sandbox can build and run the app with docker compose, with the app container listening on port 8080.");
        enriched.add("API tester can call generated endpoints through the MainGateway route prefixes.");
        enriched.add("Spring Boot controllers are exposed through /v3/api-docs and Swagger UI for automatic API discovery.");
        enriched.add("Dockerfile uses maintained Eclipse Temurin Java 17 images, not deprecated openjdk:* image tags.");
        return enriched;
    }

    private List<String> parseStringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(n -> list.add(n.asText()));
        }
        return list;
    }

    private AgentEvent buildToolCallEvent(String sessionId, String projectId, LlmToolCall tc, String status) {
        com.codeevo.agent.model.payload.ToolCallPayload payload = com.codeevo.agent.model.payload.ToolCallPayload.builder()
                .toolName(tc.getName())
                .status(status)
                .build();
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(AgentType.CHAT)
                .type(com.codeevo.agent.model.AgentEventType.TOOL_CALL)
                .payload(payload).build();
    }

    private AgentEvent buildToolResultEvent(String sessionId, String projectId, LlmToolCall tc, ToolResult result) {
        com.codeevo.agent.model.payload.ToolCallPayload payload = com.codeevo.agent.model.payload.ToolCallPayload.builder()
                .toolName(tc.getName())
                .status(result.isSuccess() ? "SUCCESS" : "FAILED")
                .resultSummary(result.isSuccess() ? result.getContent() : result.getErrorMessage())
                .build();
        return AgentEvent.builder()
                .sessionId(sessionId).projectId(projectId).agentType(AgentType.CHAT)
                .type(com.codeevo.agent.model.AgentEventType.TOOL_RESULT)
                .payload(payload).build();
    }
}
