package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsDto {
    private long totalProjects;
    private long activeProjects;
    private long inactiveProjects;
    private long totalServiceNodes;
}
