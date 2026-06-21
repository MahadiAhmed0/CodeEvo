package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class ProjectHistoryEntryDto {
    private String id;
    private String message;
    private String commitHash;
    private Integer nodeDelta;
    private Integer edgeDelta;
    private Instant createdAt;
    private String createdBy;
    private String diagramJson; // Optional, only returned for specific history entry fetch
}
