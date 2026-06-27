package com.codeevo.project.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SandboxEndpointDto {
    private String id;
    private String method;
    private String path;
    private String source;
    private String filePath;
    private String summary;
}
