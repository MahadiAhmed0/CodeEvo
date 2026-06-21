package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectHistoryRepository extends MongoRepository<ProjectHistory, String> {
    Page<ProjectHistory> findByProjectId(String projectId, Pageable pageable);
    List<ProjectHistory> findByProjectIdOrderByCreatedAtAsc(String projectId);
    void deleteByProjectId(String projectId);
    long countByProjectId(String projectId);
}
