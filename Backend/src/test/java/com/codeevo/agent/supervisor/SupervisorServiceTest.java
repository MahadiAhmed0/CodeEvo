package com.codeevo.agent.supervisor;

import com.codeevo.agent.architect.VisualArchitectAgent;
import com.codeevo.agent.chat.ChatAgent;
import com.codeevo.agent.coding.CodingAgent;
import com.codeevo.agent.config.AgentModelProperties;
import com.codeevo.agent.document.AgentSession;
import com.codeevo.agent.gateway.WebSocketGateway;
import com.codeevo.agent.memory.ConversationMemoryService;
import com.codeevo.agent.model.*;
import com.codeevo.agent.llm.LlmMessage;
import com.codeevo.agent.repository.AgentSessionRepository;
import com.codeevo.project.entity.Project;
import com.codeevo.project.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupervisorServiceTest {

    @Mock
    private ChatAgent chatAgent;
    @Mock
    private CodingAgent codingAgent;
    @Mock
    private VisualArchitectAgent architectAgent;
    @Mock
    private WebSocketGateway gateway;
    @Mock
    private AgentSessionRepository sessionRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ConversationMemoryService memoryService;

    private AgentModelProperties props;
    private SupervisorService supervisor;

    @BeforeEach
    void setUp() {
        props = new AgentModelProperties();
        props.getSupervisor().setName("TestSupervisor");
        props.getChat().setName("TestChat");
        props.getCoding().setName("TestCoding");
        props.getArchitect().setName("TestArchitect");
        props.getPermission().setTimeoutSeconds(300);

        supervisor = new SupervisorService(
                chatAgent, codingAgent, architectAgent,
                gateway, sessionRepository, projectRepository,
                props, memoryService);
        supervisor.init();
    }

    // ─── Session Management ───────────────────────────────────────────────

    @Test
    void handleUserMessage_createsNewSessionIfNoneExists() {
        String userId = "user1", sessionId = "sess1", projectId = "proj1", message = "Hello";

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any(AgentSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(projectRepository.findById(projectId))
                .thenReturn(Optional.of(Project.builder().id(projectId).name("Test Project").build()));

        doAnswer(invocation -> null)
                .when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage(userId, sessionId, projectId, message);

        verify(sessionRepository, atLeastOnce()).save(argThat(s ->
                s.getId().equals(sessionId) &&
                s.getUserId().equals(userId) &&
                s.getProjectId().equals(projectId)
        ));
    }

    @Test
    void handleUserMessage_reusesExistingSession() {
        String userId = "user1", sessionId = "sess1", projectId = "proj1", message = "Hello";

        AgentSession existing = AgentSession.builder()
                .id(sessionId).userId(userId).projectId(projectId)
                .supervisorState(SupervisorState.IDLE.name()).active(true).build();

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId))
                .thenReturn(Optional.of(existing));
        when(projectRepository.findById(projectId))
                .thenReturn(Optional.of(Project.builder().id(projectId).name("Test").build()));

        doAnswer(invocation -> null)
                .when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage(userId, sessionId, projectId, message);

        verify(sessionRepository, atLeastOnce()).findByUserIdAndProjectIdAndActiveTrue(userId, projectId);
    }

    @Test
    void handleUserMessage_withoutProjectId_handlesGracefully() {
        String userId = "user1", sessionId = "sess1", message = "Hello";

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, null))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any(AgentSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        doAnswer(invocation -> null)
                .when(chatAgent).run(anyString(), anyString(), isNull(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage(userId, sessionId, null, message);

        verify(gateway, atLeastOnce()).emit(anyString(), any(AgentEvent.class));
    }

    @Test
    void handleUserMessage_cancelsExistingApprovalTimeout() {
        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any(AgentSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(projectRepository.findById(anyString()))
                .thenReturn(Optional.of(Project.builder().id("p1").name("P").build()));

        doAnswer(invocation -> null)
                .when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage("u1", "s1", "p1", "first");
        supervisor.handleUserMessage("u1", "s1", "p1", "second");

        verify(gateway, atLeast(2)).emit(anyString(), any(AgentEvent.class));
    }

    // ─── Chat Agent Callback: Delegation to Coding ────────────────────────

    @Test
    void chatAgentCodingCallback_triggersCodingAgent() {
        String userId = "user1", sessionId = "sess1", projectId = "proj1", message = "Implement auth";

        AgentSession session = AgentSession.builder()
                .id(sessionId).userId(userId).projectId(projectId)
                .supervisorState(SupervisorState.IDLE.name()).active(true).build();

        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById(projectId))
                .thenReturn(Optional.of(Project.builder().id(projectId).name("Test").diagramJson("{}").build()));

        doAnswer(invocation -> {
            Consumer<CodingTask> onCoding = invocation.getArgument(6);
            CodingTask task = CodingTask.builder()
                    .sessionId(sessionId).projectId(projectId).userId(userId)
                    .taskSummary("Implement auth service")
                    .build();
            onCoding.accept(task);
            return null;
        }).when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage(userId, sessionId, projectId, message);

        verify(gateway, atLeastOnce()).emit(anyString(), argThat(e ->
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    @Test
    void chatAgentArchitectCallback_triggersArchitectAgent() {
        String userId = "user1", sessionId = "sess1", projectId = "proj1", message = "Add payment service";

        AgentSession session = AgentSession.builder()
                .id(sessionId).userId(userId).projectId(projectId)
                .supervisorState(SupervisorState.IDLE.name()).active(true).build();

        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(userId, projectId))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById(projectId))
                .thenReturn(Optional.of(Project.builder().id(projectId).name("Test").build()));

        doAnswer(invocation -> {
            Consumer<ArchitectureTask> onArch = invocation.getArgument(7);
            ArchitectureTask task = ArchitectureTask.builder()
                    .sessionId(sessionId).projectId(projectId).userId(userId)
                    .architectureRequest("Add payment service")
                    .build();
            onArch.accept(task);
            return null;
        }).when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage(userId, sessionId, projectId, message);

        verify(gateway, atLeastOnce()).emit(anyString(), argThat(e ->
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    // ─── Handle User Feedback ─────────────────────────────────────────────

    @Test
    void handleUserFeedback_reject_resetsToIdle() {
        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1")
                .supervisorState(SupervisorState.AWAITING_APPROVAL.name())
                .activeAgent(AgentType.VISUAL_ARCHITECT.name()).active(true).build();

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(session));

        UserFeedback feedback = UserFeedback.builder()
                .sessionId("s1").projectId("p1")
                .decision("REJECT").approvalToken("tok-1").build();

        supervisor.handleUserFeedback("u1", feedback);

        verify(gateway).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.MESSAGE &&
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    @Test
    void handleUserFeedback_approveCoding_resumesCodingTask() {
        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1")
                .supervisorState(SupervisorState.AWAITING_APPROVAL.name())
                .activeAgent(AgentType.CODING.name()).active(true).build();

        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById("p1"))
                .thenReturn(Optional.of(Project.builder().id("p1").name("Test").build()));

        doAnswer(invocation -> {
            Consumer<CodingTask> onCoding = invocation.getArgument(6);
            CodingTask task = CodingTask.builder()
                    .sessionId("s1").projectId("p1").userId("u1")
                    .taskSummary("Test coding task")
                    .build();
            onCoding.accept(task);
            return null;
        }).when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage("u1", "s1", "p1", "implement something");

        UserFeedback feedback = UserFeedback.builder()
                .sessionId("s1").projectId("p1")
                .decision("APPROVE").approvalToken("tok-1").build();

        supervisor.handleUserFeedback("u1", feedback);

        verify(gateway, atLeastOnce()).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.PROGRESS ||
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    @Test
    void handleUserFeedback_approveArchitect_createsCodingTaskAndRuns() {
        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1")
                .supervisorState(SupervisorState.AWAITING_APPROVAL.name())
                .activeAgent(AgentType.VISUAL_ARCHITECT.name()).active(true).build();

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById("p1"))
                .thenReturn(Optional.of(Project.builder().id("p1").name("Test").build()));

        UserFeedback feedback = UserFeedback.builder()
                .sessionId("s1").projectId("p1")
                .decision("APPROVE").approvalToken("tok-1").build();

        supervisor.handleUserFeedback("u1", feedback);

        verify(gateway, atLeastOnce()).emit(eq("u1"), any(AgentEvent.class));
    }

    @Test
    void handleUserFeedback_modify_reroutesToChat() {
        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1").active(true).build();

        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById("p1"))
                .thenReturn(Optional.of(Project.builder().id("p1").name("Test").build()));

        doAnswer(invocation -> null)
                .when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), contains("Modification"), any(), any());

        UserFeedback feedback = UserFeedback.builder()
                .sessionId("s1").projectId("p1")
                .decision("MODIFY").modificationNote("Change the color").build();

        supervisor.handleUserFeedback("u1", feedback);

        verify(chatAgent).run(eq("u1"), eq("s1"), eq("p1"), anyString(), nullable(String.class),
                argThat(msg -> msg.contains("Modification")), any(), any());
    }

    @Test
    void handleUserFeedback_noSession_emitsError() {
        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.empty());

        UserFeedback feedback = UserFeedback.builder()
                .sessionId("s1").projectId("p1")
                .decision("APPROVE").build();

        supervisor.handleUserFeedback("u1", feedback);

        verify(gateway).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.ERROR &&
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    // ─── Approval Timeout ─────────────────────────────────────────────────

    @Test
    void approvalTimeout_schedulesAndFires() throws Exception {
        props.getPermission().setTimeoutSeconds(1);

        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(AgentSession.builder()
                        .id("s1").userId("u1").projectId("p1").active(true).build()));

        doAnswer(invocation -> {
            Consumer<ArchitectureTask> onArch = invocation.getArgument(7);
            ArchitectureTask task = ArchitectureTask.builder()
                    .sessionId("s1").projectId("p1").userId("u1")
                    .architectureRequest("Add X")
                    .build();
            onArch.accept(task);
            return null;
        }).when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        when(projectRepository.findById("p1"))
                .thenReturn(Optional.of(Project.builder().id("p1").name("Test").build()));

        supervisor.handleUserMessage("u1", "s1", "p1", "add X");

        TimeUnit.SECONDS.sleep(2);

        verify(gateway, atLeastOnce()).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.MESSAGE &&
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    @Test
    void cancelApprovalTimeout_preventsTimeoutEvent() throws Exception {
        props.getPermission().setTimeoutSeconds(1);

        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1").active(true).build();

        lenient().when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue("u1", "p1"))
                .thenReturn(Optional.of(session));
        when(projectRepository.findById("p1"))
                .thenReturn(Optional.of(Project.builder().id("p1").name("Test").build()));

        doAnswer(invocation -> {
            Consumer<CodingTask> onCoding = invocation.getArgument(6);
            CodingTask task = CodingTask.builder()
                    .sessionId("s1").projectId("p1").userId("u1")
                    .taskSummary("Task")
                    .build();
            onCoding.accept(task);
            return null;
        }).when(chatAgent).run(anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString(), any(), any());

        supervisor.handleUserMessage("u1", "s1", "p1", "implement X");

        supervisor.handleUserMessage("u1", "s1", "p1", "new request");

        TimeUnit.SECONDS.sleep(2);

        verify(gateway, atMost(4)).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.MESSAGE &&
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    // ─── Coding Agent Results ─────────────────────────────────────────────

    @Test
    void codingAgentAsync_success_injectsCompletionIntoMemory() {
        String userId = "u1", sessionId = "s1", projectId = "p1";

        CodingTask task = CodingTask.builder()
                .sessionId(sessionId).projectId(projectId).userId(userId)
                .taskSummary("Implement X").build();

        when(codingAgent.run(anyString(), any(CodingTask.class), anyString(), anyString()))
                .thenReturn(CodingTaskResult.builder()
                        .success(true).sessionId(sessionId).projectId(projectId)
                        .filesCreated(List.of("src/main/java/X.java"))
                        .filesModified(List.of())
                        .summary("Done").build());

        supervisor.runCodingAgentAsync(userId, task, "TestProject", "{}");

        verify(memoryService).addMessage(eq(sessionId), eq(projectId), any(LlmMessage.class));
    }

    @Test
    void codingAgentAsync_failure_schedulesTimeout() {
        String userId = "u1", sessionId = "s1", projectId = "p1";

        CodingTask task = CodingTask.builder()
                .sessionId(sessionId).projectId(projectId).userId(userId)
                .taskSummary("Implement X").build();

        when(codingAgent.run(anyString(), any(CodingTask.class), anyString(), anyString()))
                .thenReturn(CodingTaskResult.builder()
                        .success(false).sessionId(sessionId).projectId(projectId)
                        .error("Build failed").build());

        supervisor.runCodingAgentAsync(userId, task, "TestProject", "{}");

        verify(memoryService).addMessage(eq(sessionId), eq(projectId), argThat(msg ->
                msg.getContent().contains("Coding Agent Result")));
    }

    @Test
    void codingAgentAsync_exception_emitsError() {
        String userId = "u1", sessionId = "s1", projectId = "p1";

        CodingTask task = CodingTask.builder()
                .sessionId(sessionId).projectId(projectId).userId(userId)
                .taskSummary("X").build();

        when(codingAgent.run(anyString(), any(CodingTask.class), anyString(), anyString()))
                .thenThrow(new RuntimeException("Agent crashed"));

        supervisor.runCodingAgentAsync(userId, task, "TestProject", "{}");

        verify(gateway).emit(eq(userId), argThat(e ->
                e.getType() == AgentEventType.FATAL_ERROR &&
                e.getAgentType() == AgentType.CODING));
    }

    // ─── Error Handling ───────────────────────────────────────────────────

    @Test
    void handleUserMessage_exception_emitsFatalError() {
        when(sessionRepository.findByUserIdAndProjectIdAndActiveTrue(anyString(), anyString()))
                .thenThrow(new RuntimeException("DB failure"));

        supervisor.handleUserMessage("u1", "s1", "p1", "Hi");

        verify(gateway).emit(eq("u1"), argThat(e ->
                e.getType() == AgentEventType.ERROR &&
                e.getAgentType() == AgentType.SUPERVISOR));
    }

    @Test
    void shutdown_terminatesTimeoutScheduler() {
        supervisor.shutdown();
    }
}
