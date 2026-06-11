package com.codeevo.project.entity;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "projects")
public class Project {
    @Id
    private String id;

    @Indexed
    private String ownerId;

    private String name;
    private String description;

    @Builder.Default
    private String status = "active"; // active, inactive, deleted

    private String diagramJson;

    @Builder.Default
    private Integer diagramVersion = 1;

    @Builder.Default
    private Integer serviceCount = 0;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Indexed(unique = true, sparse = true)
    private String idempotencyKey;
}
