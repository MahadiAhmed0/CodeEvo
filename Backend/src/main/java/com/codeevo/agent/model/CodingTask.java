package com.codeevo.agent.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Structured task descriptor passed from Chat AI → Supervisor → Coding Agent.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingTask {
    private String sessionId;
    private String projectId;
    private String userId;

    /** Highly detailed, technical description of what needs to be coded */
    private String taskSummary;

    /** Absolute file paths expected to be involved */
    private List<String> targetFiles;

    /** Verifiable conditions for task completion */
    private List<String> acceptanceCriteria;
}
