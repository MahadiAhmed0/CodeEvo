package com.codeevo.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO to create or update a single code file inside a project.
 * Used both for individual upserts and as the element type inside
 * {@link BulkUpsertCodeFilesRequest}.
 */
@Data
public class UpsertCodeFileRequest {

    @NotBlank(message = "File path cannot be blank")
    @Size(max = 1024, message = "File path must be at most 1024 characters")
    @Pattern(
            regexp = "^[a-zA-Z0-9_\\-./]+$",
            message = "File path may only contain letters, digits, underscores, hyphens, dots, and forward slashes"
    )
    private String filePath;

    @Size(max = 1_048_576, message = "File content must be at most 1 MB")
    private String content;

    @Size(max = 64, message = "Language must be at most 64 characters")
    private String language;
}
