package com.codeevo.project.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_code")
@CompoundIndexes({
    @CompoundIndex(name = "project_path_unique", def = "{'projectId': 1, 'filePath': 1}", unique = true)})
public class ProjectCode {
    @Id
    private String id;

    @Indexed
    private String projectId;

    private String filePath;
    private String content;
    private String language;

    @Builder.Default
    private Long sizeBytes = 0L;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
