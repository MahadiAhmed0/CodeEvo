package com.codeevo.agent.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for the RAG code indexer.
 *
 * Endpoints:
 *   POST /api/rag/{projectId}/index          — trigger full re-index (async)
 *   GET  /api/rag/{projectId}/status         — check how many chunks are indexed
 *   POST /api/rag/{projectId}/search         — semantic search (for debugging)
 *   GET  /api/rag/{projectId}/chunks         — list top chunks for a query (for UI context panel)
 */
@Slf4j
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final CodeIndexerService indexerService;
    private final RagSearchService ragSearchService;

    /**
     * Trigger a full re-index of a project's codebase.
     * The actual indexing runs asynchronously — this endpoint returns immediately.
     */
    @PostMapping("/{projectId}/index")
    public ResponseEntity<Map<String, Object>> triggerIndex(
            @PathVariable String projectId) {

        log.info("Indexing triggered for project {}", projectId);

        indexerService.indexProjectFromDb(projectId);

        return ResponseEntity.accepted().body(Map.of(
                "status", "indexing_started",
                "projectId", projectId,
                "message", "Indexing running in background. Check /status for progress."
        ));
    }

    /**
     * Returns the indexing status for a project.
     */
    @GetMapping("/{projectId}/status")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String projectId) {
        long count = indexerService.getIndexedChunkCount(projectId);
        return ResponseEntity.ok(Map.of(
                "projectId", projectId,
                "indexedChunks", count,
                "isIndexed", count > 0
        ));
    }

    /**
     * Debug endpoint: performs semantic search and returns formatted results.
     */
    @PostMapping("/{projectId}/search")
    public ResponseEntity<Map<String, Object>> search(
            @PathVariable String projectId,
            @RequestBody SearchRequest req) {

        String result = ragSearchService.search(
                projectId,
                req.query(),
                req.language() != null ? req.language() : "all",
                req.topK() > 0 ? req.topK() : 5
        );

        return ResponseEntity.ok(Map.of(
                "projectId", projectId,
                "query", req.query(),
                "result", result
        ));
    }

    /**
     * Returns raw CodeChunk objects for the top-K results.
     * Used by the frontend Context Panel to display relevant code snippets.
     */
    @GetMapping("/{projectId}/chunks")
    public ResponseEntity<List<ChunkResponse>> getChunks(
            @PathVariable String projectId,
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK) {

        List<CodeChunk> chunks = ragSearchService.searchChunks(projectId, query, topK);

        List<ChunkResponse> response = chunks.stream()
                .map(c -> new ChunkResponse(
                        c.getFilePath(),
                        c.getLanguage(),
                        c.getStartLine(),
                        c.getEndLine(),
                        c.getContent()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    // ─── Request / Response DTOs ──────────────────────────────────────────────

    public record SearchRequest(String query, String language, int topK) {}

    public record ChunkResponse(
            String filePath,
            String language,
            int startLine,
            int endLine,
            String content
    ) {}
}
