package com.codeevo.project.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_settings")
public class ProjectSettings {

    @Id
    private String id;

    @Indexed(unique = true)
    private String projectId;

    @Builder.Default
    private Map<String, String> environmentVariables = new HashMap<>();

    private String aiKeysEncrypted;
    private String aiKeysNonce;

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
