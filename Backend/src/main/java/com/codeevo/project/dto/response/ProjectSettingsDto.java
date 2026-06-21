package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class ProjectSettingsDto {
    private Map<String, String> environmentVariables;
    private Map<String, String> aiApiKeys; // Masked values e.g. sk-...ef3a
}
