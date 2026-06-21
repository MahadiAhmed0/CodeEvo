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

/**
 * Represents a single generated code file belonging to a project.
 * <p>
 * Each file is stored as a separate document so that individual files
 * can be created, updated, renamed, or deleted independently — making
 * the system fully modular and safe for incremental agent writes.
 * </p>
 * <p>
 * The {@code filePath} field holds the full relative path inside the
 * project (e.g. {@code UserService/src/main/java/com/codeevo/Application.java}).
 * Together with the {@code projectId}, it forms a unique compound key
 * so that upserts are idempotent.
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_code_files")
@CompoundIndexes({
        @CompoundIndex(name = "project_path_unique", def = "{'projectId': 1, 'filePath': 1}", unique = true)
})
public class ProjectCode {

    @Id
    private String id;

    /** Reference to the owning project. */
    @Indexed
    private String projectId;

    /**
     * Relative path inside the generated project tree.
     * Example: "UserService/src/main/java/com/codeevo/Application.java"
     */
    private String filePath;

    /** The raw source-code content of the file. */
    private String content;

    /** Programming language / file type hint (e.g. "java", "go", "yaml"). */
    private String language;

    /** Byte size of the content — pre-computed to avoid re-measuring. */
    @Builder.Default
    private Long sizeBytes = 0L;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
