package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectCode;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectCodeRepository extends MongoRepository<ProjectCode, String> {
    List<ProjectCode> findByProjectIdOrderByFilePathAsc(String projectId);
    Optional<ProjectCode> findByProjectIdAndFilePath(String projectId, String filepath);
    void deleteByProjectId(String projectId);
    long countByProjectId(String projectId);
}
