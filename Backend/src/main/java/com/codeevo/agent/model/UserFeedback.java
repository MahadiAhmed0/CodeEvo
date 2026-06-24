package com.codeevo.agent.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Client → Server feedback message sent to /app/agent-feedback.
 * Used to deliver approve/reject/modify decisions for PERMISSION_REQ events.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFeedback {
    private String sessionId;
    private String projectId;
    /** Token from the PERMISSION_REQ event's payload */
    private String approvalToken;
    /** APPROVE | REJECT | MODIFY */
    private String decision;
    /** If decision = MODIFY, the user's clarification note */
    private String modificationNote;
}
