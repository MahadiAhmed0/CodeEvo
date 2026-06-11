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
@Document(collection = "project_history")
public class ProjectHistory {
    @Id
    private String id;

    @Indexed
    private String projectId;

    private String diagramJson;
    private String message;
    private String commitHash;

    @Builder.Default
    private Integer nodeDelta = 0;

    @Builder.Default
    private Integer edgeDelta = 0;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private String createdBy;
}
