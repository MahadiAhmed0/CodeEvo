package com.codeevo.agent.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * MongoDB document that stores a single semantic chunk of a source file.
 *
 * Each chunk holds:
 *  - the raw code text (for display in the UI)
 *  - a vector embedding produced by the Groq/OpenAI-compatible embedding endpoint
 *  - provenance metadata (project, file, line range, language)
 *
 * Vector search is performed in-process using cosine similarity (Phase 2).
 * When the project scales to need true ANN search, replace the in-process
 * scan with MongoDB Atlas Vector Search ($vectorSearch aggregation stage).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "code_chunks")
@CompoundIndexes({
    @CompoundIndex(name = "project_file_idx", def = "{'projectId': 1, 'filePath': 1}"),
    @CompoundIndex(name = "project_lang_idx", def = "{'projectId': 1, 'language': 1}")
})
public class CodeChunk {

    @Id
    private String id;

    /** The project this chunk belongs to */
    private String projectId;

    /** Project-relative file path (e.g. src/main/java/com/codeevo/agent/chat/ChatAgent.java) */
    private String filePath;

    /** Programming language inferred from extension */
    private String language;

    /** 1-indexed start line of this chunk in its source file */
    private int startLine;

    /** 1-indexed end line (inclusive) of this chunk */
    private int endLine;

    /** Raw source text of this chunk (used for display) */
    private String content;

    /**
     * Dense vector embedding produced by the embedding model.
     * Stored as a flat List<Double> for compatibility with all MongoDB versions.
     * Atlas Vector Search requires this field to be named "embedding" and be a
     * fixed-dimension float array — this satisfies both requirements.
     */
    private List<Double> embedding;

    /** When this chunk was last indexed */
    private Instant indexedAt;

    /** SHA-256 hash of {@code content} for incremental re-indexing */
    private String contentHash;
}
