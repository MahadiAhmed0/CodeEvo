package com.codeevo.project.dto.request;

import lombok.Data;
import java.util.Map;

@Data
public class UpdateProjectSettingsRequest {
    private Map<String, String> environmentVariables;
    private Map<String, String> aiApiKeys;
}
