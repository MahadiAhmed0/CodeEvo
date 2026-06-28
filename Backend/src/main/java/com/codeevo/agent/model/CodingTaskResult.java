package com.codeevo.agent.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodingTaskResult {
    private boolean success;
    private String sessionId;
    private String projectId;
    private List<String> filesCreated;
    private List<String> filesModified;
    /** Final summary from the agent's own progress messages */
    private String summary;
    private String error;
}
