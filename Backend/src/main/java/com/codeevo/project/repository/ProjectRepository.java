package com.codeevo.project.repository;

import com.codeevo.project.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    Page<Project> findByOwnerIdAndStatus(String ownerId, String status, Pageable pageable);
    Page<Project> findByOwnerIdAndStatusNot(String ownerId, String status, Pageable pageable);

    Page<Project> findBtOwnerIdAndStatusNotAndNameContainingIgnoreCase(String ownerId, String status, String name, Pageable pageable);
    Page<Project> findByOwnerIdAndStatusAndNameContainingIgnoreCase(String ownerId, String status, String name, Pageable pageable);

    Optional<Project> findByIdempotencyKey(String idempotencyKey);

    long countByOwnerIdAndStatusNot(String ownerId, String status);
    long countByOwnerIdAndStatus(String ownerId, String status);
}
