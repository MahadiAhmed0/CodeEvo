package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectHistoryRepository extends MongoRepository<ProjectHistory, String> {
    Page<ProjectHistory> findByProjectId(String ProjectId, Pageable pageable);
    void deleteByProjectId(String ProjectId);
}
