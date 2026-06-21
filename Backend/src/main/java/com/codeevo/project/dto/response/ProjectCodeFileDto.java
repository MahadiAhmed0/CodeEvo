package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Flat response DTO representing a single stored code file.
 */
@Data
@Builder
public class ProjectCodeFileDto {
    private String id;
    private String projectId;
    private String filePath;
    private String content;
    private String language;
    private Long sizeBytes;
    private Instant createdAt;
    private Instant updatedAt;
}
