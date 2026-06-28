package com.codeevo.github.repository;

import com.codeevo.github.entity.ProjectGitHubLink;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectGitHubLinkRepository extends MongoRepository<ProjectGitHubLink, String> {

    Optional<ProjectGitHubLink> findByProjectId(String projectId);

    List<ProjectGitHubLink> findByUserId(String userId);

    Optional<ProjectGitHubLink> findByFullName(String fullName);

    void deleteByProjectId(String projectId);
}
