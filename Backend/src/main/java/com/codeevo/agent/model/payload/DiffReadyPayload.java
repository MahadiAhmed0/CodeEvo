package com.codeevo.agent.model.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload for DIFF_READY events. The frontend displays this in the
 * Monaco-style diff viewer with Approve/Reject buttons.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiffReadyPayload {
    private String filePath;
    private String originalContent;
    private String modifiedContent;
    private String changeDescription;
    /** If true, user must click Approve before the file is written */
    private boolean requiresApproval;
    /** Token the client sends back in UserFeedback to identify this change */
    private String approvalToken;
}
