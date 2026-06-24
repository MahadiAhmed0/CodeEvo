package com.codeevo.agent.supervisor;

import com.codeevo.agent.architect.VisualArchitectAgent;
import com.codeevo.agent.chat.ChatAgent;
import com.codeevo.agent.coding.CodingAgent;
import com.codeevo.agent.config.AgentModelProperties;
import com.codeevo.agent.document.AgentSession;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.model.*;
import com.codeevo.agent.repository.AgentSessionRepository;
import com.codeevo.project.entity.Project;
import com.codeevo.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agent 0: Supervisor / Meta-Orchestrator
 *
 * The Supervisor is a DETERMINISTIC Spring Boot service — it is NOT an LLM.
 * It manages the lifecycle of the other three agents and is the most critical
 * component for production reliability.
 *
 * Responsibilities:
 * - Receives raw user messages from the WebSocket gateway
 * - Spins up the Chat AI first (always the entry point)
 * - Handles agent handoff: Chat AI → Coding Agent or Visual Architect
 * - Manages session state in MongoDB
 * - Routes user feedback (approve/reject) to the correct waiting agent
 * - Broadcasts events to the frontend via WebSocketGateway
 *
 * State Machine:
 * IDLE → ROUTING (Chat AI) → EXECUTING (Coding) | DESIGNING (Architect)
 *      → AWAITING_APPROVAL → EXECUTING | COMPLETE → IDLE
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SupervisorService {

    private final ChatAgent chatAgent;
    private final CodingAgent codingAgent;
    private final VisualArchitectAgent architectAgent;
    private final WebSocketGateway gateway;
    private final AgentSessionRepository sessionRepository;
    private final ProjectRepository projectRepository;
    private final AgentModelProperties props;

    /**
     * In-flight pending tasks: sessionId → CodingTask (so we can resume after ask_user)
     * In production, this would be stored in Redis for crash recovery.
     */
    private final ConcurrentHashMap<String, CodingTask> pendingCodingTasks = new ConcurrentHashMap<>();

    /**
     * Receives a new user text message. Runs asynchronously so the WebSocket
     * handler thread returns immediately.
     */
    @Async
    public void handleUserMessage(String userId, String sessionId,
                                   String projectId, String userMessage) {
        log.info("[{}] User message from {}: {}", sessionId, userId,
                userMessage.substring(0, Math.min(80, userMessage.length())));
        try {
            // Ensure session exists in MongoDB
            AgentSession session = getOrCreateSession(userId, sessionId, projectId);
            updateSessionState(session, SupervisorState.ROUTING, AgentType.CHAT.name());

            // Fetch actual project context from DB
            Project project = null;
            if (projectId != null && !projectId.isEmpty()) {
                project = projectRepository.findById(projectId).orElse(null);
            }
            String projectName = project != null && project.getName() != null ? project.getName() : "Your Project";
            String diagramJson = project != null ? project.getDiagramJson() : null;

            // Broadcast that Chat AI is starting
            gateway.emit(userId, AgentEvent.progress(sessionId, projectId,
                    AgentType.SUPERVISOR,
                    props.getSupervisor().getName() + ": routing to " + props.getChat().getName(),
                    "RUNNING"));

            // Start the Chat AI loop
            chatAgent.run(
                    userId, sessionId, projectId,
                    projectName, diagramJson,
                    userMessage,
                    // onCodingTask callback
                    codingTask -> {
                        pendingCodingTasks.put(sessionId, codingTask);
                        updateSessionState(session, SupervisorState.EXECUTING, AgentType.CODING.name());
                        gateway.emit(userId, AgentEvent.progress(sessionId, projectId,
                                AgentType.SUPERVISOR,
                                "Handed off to " + props.getCoding().getName(), "SUCCESS"));
                        runCodingAgentAsync(userId, codingTask, projectName, diagramJson);
                    },
                    // onArchitectTask callback
                    archTask -> {
                        updateSessionState(session, SupervisorState.DESIGNING, AgentType.VISUAL_ARCHITECT.name());
                        gateway.emit(userId, AgentEvent.progress(sessionId, projectId,
                                AgentType.SUPERVISOR,
                                "Handed off to " + props.getArchitect().getName(), "SUCCESS"));
                        runArchitectAgentAsync(userId, archTask, session, projectName, diagramJson);
                    }
            );

            updateSessionState(session, SupervisorState.IDLE, null);

        } catch (Exception e) {
            log.error("[{}] FATAL: Supervisor crashed handling user message: {}", sessionId, e.getMessage(), e);
            gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.SUPERVISOR,
                    "Internal error: " + e.getMessage(), false));
        }
    }

    /**
     * Receives approve/reject/modify feedback from the user for a pending permission request.
     * Routes to the correct waiting agent based on the session's pending approval token.
     */
    @Async
    public void handleUserFeedback(String userId, UserFeedback feedback) {
        String sessionId = feedback.getSessionId();
        String projectId = feedback.getProjectId();

        log.info("[{}] User feedback: decision={}, token={}",
                sessionId, feedback.getDecision(), feedback.getApprovalToken());

        AgentSession session = sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId)
                .orElse(null);

        if (session == null) {
            gateway.emit(userId, AgentEvent.error(sessionId, projectId, AgentType.SUPERVISOR,
                    "No active session found for this project.", false));
            return;
        }

        if ("REJECT".equals(feedback.getDecision())) {
            gateway.emit(userId, AgentEvent.message(sessionId, projectId,
                    AgentType.SUPERVISOR, "Action rejected. What would you like to do instead?"));
            updateSessionState(session, SupervisorState.IDLE, null);
            return;
        }

        if ("APPROVE".equals(feedback.getDecision())) {
            String activeAgent = session.getActiveAgent();

            // Fetch actual project context from DB
            Project project = null;
            if (projectId != null && !projectId.isEmpty()) {
                project = projectRepository.findById(projectId).orElse(null);
            }
            String projectName = project != null && project.getName() != null ? project.getName() : "Your Project";
            String diagramJson = project != null ? project.getDiagramJson() : null;

            if (AgentType.CODING.name().equals(activeAgent)) {
                // Resume coding agent after ask_user
                CodingTask pending = pendingCodingTasks.get(sessionId);
                if (pending != null) {
                    runCodingAgentAsync(userId, pending, projectName, diagramJson);
                }
            } else if (AgentType.VISUAL_ARCHITECT.name().equals(activeAgent)) {
                // User approved the architecture — trigger code generation
                CodingTask codeTask = CodingTask.builder()
                        .sessionId(sessionId).projectId(projectId).userId(userId)
                        .taskSummary("Generate code for the approved architecture design. " +
                                "Implement all planned files as described in the Visual Architect's output.")
                        .build();
                pendingCodingTasks.put(sessionId, codeTask);
                updateSessionState(session, SupervisorState.EXECUTING, AgentType.CODING.name());
                gateway.emit(userId, AgentEvent.progress(sessionId, projectId,
                        AgentType.SUPERVISOR,
                        "Architecture approved! Activating " + props.getCoding().getName() + "...",
                        "RUNNING"));
                runCodingAgentAsync(userId, codeTask, projectName, diagramJson);
            }
        }

        if ("MODIFY".equals(feedback.getDecision())) {
            // Re-route to Chat AI with the modification note
            handleUserMessage(userId, sessionId, projectId,
                    "Modification: " + feedback.getModificationNote());
        }
    }

    // ─── Async Agent Runners ──────────────────────────────────────────────────

    @Async
    public void runCodingAgentAsync(String userId, CodingTask task, String projectName, String diagramJson) {
        try {
            codingAgent.run(userId, task, projectName, diagramJson);
        } catch (Exception e) {
            log.error("Coding agent crashed for session {}", task.getSessionId(), e);
            gateway.emit(userId, AgentEvent.error(task.getSessionId(), task.getProjectId(),
                    AgentType.CODING, "Coding Agent crashed: " + e.getMessage(), true));
        }
    }

    @Async
    public void runArchitectAgentAsync(String userId, ArchitectureTask task, AgentSession session, String projectName, String diagramJson) {
        try {
            architectAgent.run(userId, task, projectName, diagramJson,
                    // onCodeApproved — triggered when user clicks Approve on the graph
                    codingTask -> {
                        pendingCodingTasks.put(task.getSessionId(), codingTask);
                        updateSessionState(session, SupervisorState.AWAITING_APPROVAL,
                                AgentType.VISUAL_ARCHITECT.name());
                    });
        } catch (Exception e) {
            log.error("Architect agent crashed for session {}", task.getSessionId(), e);
            gateway.emit(userId, AgentEvent.error(task.getSessionId(), task.getProjectId(),
                    AgentType.VISUAL_ARCHITECT, "Architect crashed: " + e.getMessage(), true));
        }
    }

    // ─── Session Management ───────────────────────────────────────────────────

    private AgentSession getOrCreateSession(String userId, String sessionId, String projectId) {
        return sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId)
                .orElseGet(() -> sessionRepository.save(AgentSession.builder()
                        .id(sessionId)
                        .userId(userId)
                        .projectId(projectId)
                        .supervisorState(SupervisorState.IDLE.name())
                        .build()));
    }

    private void updateSessionState(AgentSession session, SupervisorState state, String activeAgent) {
        session.setSupervisorState(state.name());
        session.setActiveAgent(activeAgent);
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);
    }
}
