package com.codeevo.agent.model.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Payload for PERMISSION_REQ events.
 * Pauses agent execution; the frontend shows Approve/Reject/Modify buttons.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionRequestPayload {
    /** Human-readable description of what will happen if approved */
    private String actionDescription;
    /** Summary of consequences (e.g. "This will create 3 files and modify 1 file.") */
    private String consequences;
    /** Token sent back by the client in UserFeedback.approvalToken */
    private String approvalToken;
    /** Optional: files to be created */
    private List<String> plannedFilesToCreate;
    /** Optional: files to be modified */
    private List<String> plannedFilesToModify;
}
