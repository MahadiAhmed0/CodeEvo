package com.codeevo.agent.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * MongoDB document tracking the lifecycle of an agent session.
 * One AgentSession per WebSocket connection / conversation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "agent_sessions")
public class AgentSession {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String projectId;

    /** Current supervisor state machine state */
    private String supervisorState; // IDLE, ROUTING, EXECUTING, DESIGNING, REVIEWING, COMPLETE

    /** Currently active agent */
    private String activeAgent;

    /** Pending approval token, if any agent is waiting for user feedback */
    private String pendingApprovalToken;

    /** Task that is currently being executed by the Coding Agent */
    private String currentTaskSummary;

    /** List of file paths modified in the current task */
    private List<String> modifiedFiles;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Builder.Default
    private boolean active = true;
}
