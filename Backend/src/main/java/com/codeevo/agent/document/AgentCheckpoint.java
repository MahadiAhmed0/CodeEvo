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
 * MongoDB document storing crash-recovery checkpoints for the Coding Agent.
 * If the agent crashes mid-task, it resumes from the last saved checkpoint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "agent_checkpoints")
public class AgentCheckpoint {

    @Id
    private String id;

    @Indexed
    private String sessionId;

    private String projectId;
    private String userId;

    private List<String> completedSteps;
    private List<String> remainingSteps;
    private String taskSummary;

    @Builder.Default
    private Instant savedAt = Instant.now();
}
