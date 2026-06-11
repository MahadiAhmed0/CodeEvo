package com.codeevo.project.repository;

import com.codeevo.project.entity.ProjectSettings;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectSettingsRepository extends MongoRepository<ProjectSettings, String> {
        Optional<ProjectSettings> findByProjectId(String projectId);
        void deleteByProjectId(String projectId);
}
