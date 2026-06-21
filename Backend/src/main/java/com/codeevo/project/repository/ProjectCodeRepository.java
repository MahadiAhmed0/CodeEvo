package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectCodeRepository extends MongoRepository<ProjectCode, String> {

    /** Retrieve every code file belonging to a project, ordered by path for deterministic tree building. */
    List<ProjectCode> findByProjectIdOrderByFilePathAsc(String projectId);

    /** Look up a single file by its unique (projectId + filePath) pair. */
    Optional<ProjectCode> findByProjectIdAndFilePath(String projectId, String filePath);

    /** Delete all code files when a project is hard-deleted. */
    void deleteByProjectId(String projectId);

    /** Count total files in a project (used for quota checks). */
    long countByProjectId(String projectId);
}
