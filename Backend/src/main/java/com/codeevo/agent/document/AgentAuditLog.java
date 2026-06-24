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
 * MongoDB document recording each individual agent action for audit/observability.
 * Every tool call, file modification, and decision is logged here.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "agent_audit_log")
public class AgentAuditLog {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    @Indexed
    private String projectId;

    @Indexed
    private String userId;

    private String agentType;   // CHAT, VISUAL_ARCHITECT, CODING, SUPERVISOR
    private String eventType;   // TOOL_CALL, FILE_MODIFIED, PERMISSION_GRANTED, etc.
    private String toolName;
    private String summary;
    private String outcome;     // SUCCESS, FAILED, PENDING_APPROVAL

    private List<String> affectedFiles;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
