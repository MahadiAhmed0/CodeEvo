package com.codeevo.agent.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 2: RAG (Retrieval-Augmented Generation) Search Service
 *
 * Replaces the Phase 1 text-scan in ChatAgentTools.searchProjectContext()
 * with real semantic vector search against MongoDB code chunks.
 *
 * Search Pipeline:
 *   1. Embed the query string using EmbeddingService
 *   2. Load all chunks for the project from MongoDB (in-process scan)
 *   3. Compute cosine similarity between query embedding and each chunk
 *   4. Return the top-K chunks ranked by similarity, formatted for LLM injection
 *
 * Scaling note:
 *   In-process cosine scan is O(N) over all project chunks. For large repos
 *   (>50k chunks) replace with MongoDB Atlas $vectorSearch or a dedicated
 *   vector DB. For typical projects (<5k source files), this is fast enough.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagSearchService {

    private final CodeChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;
    private final CodeIndexerService indexerService;

    @Value("${codeevo.agent.rag.min-similarity:0.3}")
    private double minSimilarity;

    @Value("${codeevo.agent.rag.auto-index:true}")
    private boolean autoIndex;

    @Value("${codeevo.project.base-path:#{null}}")
    private String projectBasePath;

    /**
     * Performs semantic search over the project's indexed codebase.
     *
     * @param projectId     The project to search
     * @param query         Natural language query (e.g. "how does user authentication work")
     * @param languageFilter Optional language filter (java, typescript, all)
     * @param topK          Number of top results to return
     * @return Formatted string of relevant code chunks for LLM injection
     */
    public String search(String projectId, String query, String languageFilter, int topK) {
        long chunkCount = chunkRepository.countByProjectId(projectId);

        // Auto-index if project has no chunks yet
        if (chunkCount == 0 && autoIndex) {
            log.info("Project {} has no indexed chunks. Triggering background DB indexing.", projectId);
            indexerService.indexProjectFromDb(projectId);
            // Return a graceful message — indexing will complete asynchronously
            return "Indexing your project code in the background. Please ask again in a few seconds for accurate results.";
        }

        if (chunkCount == 0) {
            return "No code indexed for this project yet. Call the index API first.";
        }

        // 1. Embed the query
        List<Double> queryEmbedding = embeddingService.embed(query);
        if (queryEmbedding.isEmpty()) {
            log.warn("Failed to embed query '{}', falling back to text search.", query);
            return fallbackTextSearch(projectId, query, languageFilter, topK);
        }

        // 2. Load chunks (filtered by language if specified)
        List<CodeChunk> chunks = "all".equalsIgnoreCase(languageFilter)
                ? chunkRepository.findAllByProjectId(projectId)
                : chunkRepository.findByProjectIdAndLanguage(projectId, mapLanguageFilter(languageFilter));

        if (chunks.isEmpty()) {
            return "No " + languageFilter + " code indexed for project " + projectId;
        }

        // 3. Score chunks by cosine similarity (skip chunks with no embedding)
        record ScoredChunk(CodeChunk chunk, double score) {}

        List<ScoredChunk> scored = chunks.stream()
                .filter(c -> c.getEmbedding() != null && !c.getEmbedding().isEmpty())
                .map(c -> new ScoredChunk(c, EmbeddingService.cosineSimilarity(queryEmbedding, c.getEmbedding())))
                .filter(s -> s.score() >= minSimilarity)
                .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
                .limit(topK)
                .toList();

        if (scored.isEmpty()) {
            log.debug("No chunks above similarity threshold {:.2f}. Falling back to text search.", minSimilarity);
            return fallbackTextSearch(projectId, query, languageFilter, topK);
        }

        // 4. Format results for LLM context injection
        StringBuilder result = new StringBuilder();
        result.append("Found ").append(scored.size()).append(" relevant code sections:\n\n");

        for (ScoredChunk sc : scored) {
            CodeChunk chunk = sc.chunk();
            result.append("📄 **").append(chunk.getFilePath()).append("**");
            result.append(" (lines ").append(chunk.getStartLine()).append("–").append(chunk.getEndLine()).append(")");
            result.append(" [similarity: ").append(String.format("%.2f", sc.score())).append("]\n");
            result.append("```").append(chunk.getLanguage()).append("\n");
            result.append(chunk.getContent()).append("\n");
            result.append("```\n\n");
        }

        return result.toString();
    }

    /**
     * Returns a list of {@link CodeChunk} objects for the top-K results.
     * Used programmatically by other services (e.g., for UI display).
     */
    public List<CodeChunk> searchChunks(String projectId, String query, int topK) {
        List<Double> queryEmbedding = embeddingService.embed(query);
        if (queryEmbedding.isEmpty()) return List.of();

        List<CodeChunk> chunks = chunkRepository.findAllByProjectId(projectId);

        record ScoredChunk(CodeChunk chunk, double score) {}

        return chunks.stream()
                .filter(c -> c.getEmbedding() != null && !c.getEmbedding().isEmpty())
                .map(c -> new ScoredChunk(c, EmbeddingService.cosineSimilarity(queryEmbedding, c.getEmbedding())))
                .filter(s -> s.score() >= minSimilarity)
                .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
                .limit(topK)
                .map(ScoredChunk::chunk)
                .collect(Collectors.toList());
    }

    // ─── Fallback ─────────────────────────────────────────────────────────────

    /**
     * Phase 1 text-scan fallback, used when embedding is unavailable.
     * Preserved so the system degrades gracefully without an API key.
     */
    private String fallbackTextSearch(String projectId, String query, String languageFilter, int topK) {
        List<CodeChunk> chunks = chunkRepository.findAllByProjectId(projectId);
        if (chunks.isEmpty()) return "No code indexed yet for project " + projectId;

        String[] terms = query.toLowerCase().split("\\s+");
        List<String> stopWords = List.of("the", "a", "an", "is", "in", "it", "to", "of", "for", "and");

        record Match(CodeChunk chunk, int score) {}

        List<Match> matches = chunks.stream()
                .map(c -> {
                    String lower = c.getContent().toLowerCase();
                    int score = Arrays.stream(terms)
                            .filter(t -> t.length() > 2 && !stopWords.contains(t))
                            .mapToInt(t -> {
                                int count = 0, idx = 0;
                                while ((idx = lower.indexOf(t, idx)) != -1) { count++; idx += t.length(); }
                                return count;
                            }).sum();
                    return new Match(c, score);
                })
                .filter(m -> m.score() > 0)
                .sorted(Comparator.comparingInt(Match::score).reversed())
                .limit(topK)
                .toList();

        if (matches.isEmpty()) return "No matching code found for: \"" + query + "\"";

        StringBuilder result = new StringBuilder("Found ").append(matches.size()).append(" matching sections (text search):\n\n");
        for (Match m : matches) {
            CodeChunk c = m.chunk();
            result.append("📄 **").append(c.getFilePath()).append("** (lines ")
                  .append(c.getStartLine()).append("–").append(c.getEndLine()).append(")\n");
            result.append("```").append(c.getLanguage()).append("\n")
                  .append(c.getContent()).append("\n```\n\n");
        }
        return result.toString();
    }

    private String mapLanguageFilter(String filter) {
        if (filter == null) return "java";
        return switch (filter.toLowerCase()) {
            case "ts", "tsx", "typescript" -> "typescript";
            case "js", "javascript" -> "javascript";
            case "py", "python" -> "python";
            default -> filter.toLowerCase();
        };
    }
}
