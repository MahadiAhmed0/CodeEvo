package com.codeevo.agent.rag;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * MongoDB repository for {@link CodeChunk} documents.
 */
@Repository
public interface CodeChunkRepository extends MongoRepository<CodeChunk, String> {

    /** Returns all chunks for a given project (used for in-process vector search) */
    List<CodeChunk> findAllByProjectId(String projectId);

    /** Returns chunks for a specific file (used for incremental re-index) */
    List<CodeChunk> findAllByProjectIdAndFilePath(String projectId, String filePath);

    /** Counts indexed chunks for a project (used for indexing status API) */
    long countByProjectId(String projectId);

    /** Delete all chunks for a project (full re-index) */
    void deleteAllByProjectId(String projectId);

    /** Delete all chunks for a specific file (incremental re-index) */
    void deleteAllByProjectIdAndFilePath(String projectId, String filePath);

    /** Returns all chunks in a given language for a project */
    @Query("{'projectId': ?0, 'language': ?1}")
    List<CodeChunk> findByProjectIdAndLanguage(String projectId, String language);
}
