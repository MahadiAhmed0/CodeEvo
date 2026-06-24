package com.codeevo.agent.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Structured task descriptor passed from Chat AI → Supervisor → Visual Architect Agent.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArchitectureTask {
    private String sessionId;
    private String projectId;
    private String userId;

    /** Technical description of the new architectural component(s) requested */
    private String architectureRequest;

    /** 2-3 sentence summary of the relevant existing architecture from RAG results */
    private String currentContextSummary;
}
