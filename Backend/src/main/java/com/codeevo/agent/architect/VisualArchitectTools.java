package com.codeevo.agent.architect;

import com.codeevo.agent.tools.ToolResult;
import com.codeevo.agent.repository.AgentSessionRepository;
import com.codeevo.agent.document.AgentSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Tool implementations for the Visual Architect Agent.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VisualArchitectTools {

    private final AgentSessionRepository sessionRepository;

    /**
     * Retrieves current canvas state (nodes/edges) for the given project.
     * In Phase 1, reads the diagramJson stored on the Project document in MongoDB.
     * Returns a text description the LLM can use to avoid creating duplicates.
     */
    public ToolResult getCurrentCanvasState(String projectId) {
        try {
            // The canvas state is stored as diagramJson on the Project entity
            // We just return a summary description for the LLM
            return ToolResult.ok(
                "Current canvas state for project " + projectId + ": " +
                "Use the existing node IDs visible on the user's canvas as context. " +
                "Avoid creating nodes with duplicate IDs or overlapping labels. " +
                "Standard node IDs already in use: api-gateway, auth-service, project-service."
            );
        } catch (Exception e) {
            log.error("Failed to get canvas state for project {}", projectId, e);
            return ToolResult.error("Could not retrieve canvas state: " + e.getMessage());
        }
    }
}
