package com.codeevo.agent.chat;

import com.codeevo.agent.rag.RagSearchService;
import com.codeevo.agent.tools.ToolResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Tool implementations for the Chat AI agent.
 *
 * Phase 2: search_project_context now uses real RAG semantic search
 * via {@link RagSearchService}. Embeddings are stored in MongoDB and
 * cosine similarity is computed in-process. Falls back to text scan
 * if embeddings are unavailable.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatAgentTools {

    private final RagSearchService ragSearchService;

    /**
     * Phase 2: Semantic search using vector embeddings.
     *
     * @param projectId      The project to search
     * @param semanticQuery  Natural language query from the LLM
     * @param fileTypeFilter Language filter: java | ts | tsx | all
     * @param topK           Number of top results
     */
    public ToolResult searchProjectContext(String projectId, String semanticQuery,
                                            String fileTypeFilter, int topK) {
        log.debug("RAG search: project={}, query='{}', filter={}, topK={}",
                projectId, semanticQuery, fileTypeFilter, topK);

        try {
            String result = ragSearchService.search(
                    projectId,
                    semanticQuery,
                    fileTypeFilter != null ? fileTypeFilter : "all",
                    topK > 0 ? topK : 5
            );
            return ToolResult.ok(result);
        } catch (Exception e) {
            log.error("RAG search failed for project {}: {}", projectId, e.getMessage());
            return ToolResult.error("Code search temporarily unavailable: " + e.getMessage());
        }
    }
}
