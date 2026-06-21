package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class SaveDiagramResponseDto {
    private Integer diagramVersion;
    private Integer serviceCount;
    private Instant updatedAt;
    private String historyEntryId;
}
