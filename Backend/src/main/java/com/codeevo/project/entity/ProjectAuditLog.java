package com.codeevo.project.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_audit_log")
public class ProjectAuditLog {
    @Id
    private String id;

    @Indexed
    private String projectId;

    @Indexed
    private String userId;

    private String action; // CREATE, UPDATE, DELETE, SETTINGS_UPDATE, RESTORE
    private String detail;
    private String ipAddress;
    private String userAgent;

    @Builder.Default
    private Instant occurredAt = Instant.now();
}
