package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class ProjectSummaryDto {
    private String id;
    private String name;
    private String description;
    private String status;
    private Integer serviceCount;
    private Instant createdAt;
    private Instant updatedAt;
}
