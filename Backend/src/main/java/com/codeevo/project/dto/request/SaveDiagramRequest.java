package com.codeevo.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SaveDiagramRequest {
    @NotBlank(message = "Diagram JSON is required")
    private String diagramJson;

    @Size(max = 512, message = "Change message must be at most 512 characters")
    private String changeMessage;
}
