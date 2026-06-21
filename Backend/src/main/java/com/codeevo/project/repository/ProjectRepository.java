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

    Page<Project> findByOwnerIdAndNameContainingIgnoreCase(String ownerId, String name, Pageable pageable);
    Page<Project> findByOwnerIdAndStatusNotAndNameContainingIgnoreCase(String ownerId, String status, String name, Pageable pageable);
    Page<Project> findByOwnerIdAndStatusAndNameContainingIgnoreCase(String ownerId, String status, String name, Pageable pageable);

    Page<Project> findByOwnerId(String ownerId, Pageable pageable);

    Optional<Project> findByIdempotencyKey(String idempotencyKey);

    long countByOwnerId(String ownerId);
    long countByOwnerIdAndStatus(String ownerId, String status);
    long countByOwnerIdAndStatusNot(String ownerId, String status);
}
