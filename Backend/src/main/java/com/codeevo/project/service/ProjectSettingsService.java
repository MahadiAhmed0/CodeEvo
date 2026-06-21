package com.codeevo.project.service;

import com.codeevo.project.dto.request.UpdateProjectSettingsRequest;
import com.codeevo.project.dto.response.ProjectSettingsDto;
import com.codeevo.project.entity.ProjectSettings;
import com.codeevo.project.repository.ProjectSettingsRepository;
import com.codeevo.project.util.SanitizerUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectSettingsService {

    private final ProjectSettingsRepository settingsRepository;
    private final EncryptionService encryptionService;
    private final SanitizerUtil sanitizer;
    private final ObjectMapper objectMapper;
    private final ProjectAuditService auditService;

    private static final Pattern ENV_VAR_PATTERN = Pattern.compile("^[A-Z_][A-Z0-9_]{0,127}$");

    @Transactional
    public void initializeSettings(String projectId) {
        ProjectSettings settings = ProjectSettings.builder()
                .projectId(projectId)
                .build();
        settingsRepository.save(settings);
    }

    public ProjectSettingsDto getSettings(String projectId) {
        ProjectSettings settings = settingsRepository.findByProjectId(projectId)
                .orElseGet(() -> ProjectSettings.builder().projectId(projectId).build());

        return ProjectSettingsDto.builder()
                .environmentVariables(settings.getEnvironmentVariables())
                .aiApiKeys(getMaskedAiKeys(settings))
                .build();
    }

    @Transactional
    public ProjectSettingsDto updateSettings(String projectId, String userId, UpdateProjectSettingsRequest request) {
        ProjectSettings settings = settingsRepository.findByProjectId(projectId)
                .orElseGet(() -> ProjectSettings.builder().projectId(projectId).build());

        // Update env variables if present
        if (request.getEnvironmentVariables() != null) {
            Map<String, String> currentEnvVars = settings.getEnvironmentVariables() != null ? 
                    settings.getEnvironmentVariables() : new HashMap<>();
            
            for (Map.Entry<String, String> entry : request.getEnvironmentVariables().entrySet()) {
                String key = sanitizer.sanitize(entry.getKey());
                String value = sanitizer.sanitize(entry.getValue());
                
                if (key != null && ENV_VAR_PATTERN.matcher(key).matches()) {
                    if (value == null || value.isEmpty()) {
                        currentEnvVars.remove(key);
                    } else {
                        currentEnvVars.put(key, value);
                    }
                }
            }
            settings.setEnvironmentVariables(currentEnvVars);
        }

        // Update AI Keys if present
        if (request.getAiApiKeys() != null) {
            Map<String, String> currentKeys = decryptAiKeys(settings);
            
            for (Map.Entry<String, String> entry : request.getAiApiKeys().entrySet()) {
                String key = sanitizer.sanitize(entry.getKey());
                String value = entry.getValue(); // Do not sanitize the value as it might break the key format
                
                if (value != null && value.trim().isEmpty()) {
                    currentKeys.remove(key); // Remove if empty string
                } else if (value != null && !value.isEmpty()) {
                    currentKeys.put(key, value.trim());
                }
            }
            encryptAndSetAiKeys(settings, currentKeys);
        }

        settings.setUpdatedAt(Instant.now());
        settingsRepository.save(settings);

        auditService.log(userId, projectId, "SETTINGS_UPDATE", null, null, null);

        return getSettings(projectId);
    }

    private Map<String, String> decryptAiKeys(ProjectSettings settings) {
        if (settings.getAiKeysEncrypted() == null || settings.getAiKeysNonce() == null) {
            return new HashMap<>();
        }
        try {
            String plainJson = encryptionService.decrypt(settings.getAiKeysEncrypted(), settings.getAiKeysNonce());
            return objectMapper.readValue(plainJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.error("Failed to decrypt AI keys for project {}", settings.getProjectId(), e);
            return new HashMap<>();
        }
    }

    private void encryptAndSetAiKeys(ProjectSettings settings, Map<String, String> keys) {
        if (keys == null || keys.isEmpty()) {
            settings.setAiKeysEncrypted(null);
            settings.setAiKeysNonce(null);
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(keys);
            EncryptionService.EncryptedData encrypted = encryptionService.encrypt(json);
            settings.setAiKeysEncrypted(encrypted.cipherText);
            settings.setAiKeysNonce(encrypted.nonce);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize AI keys for project {}", settings.getProjectId(), e);
            throw new RuntimeException("Failed to process AI keys");
        }
    }

    private Map<String, String> getMaskedAiKeys(ProjectSettings settings) {
        Map<String, String> keys = decryptAiKeys(settings);
        Map<String, String> masked = new HashMap<>();
        
        for (Map.Entry<String, String> entry : keys.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value != null && value.length() > 4) {
                String prefix = value.substring(0, Math.min(3, value.length() - 4));
                String suffix = value.substring(value.length() - 4);
                masked.put(key, prefix + "..." + suffix);
            } else {
                masked.put(key, "***"); // Too short to mask properly
            }
        }
        
        // Ensure keys from spec exist as null if not set
        String[] defaultKeys = {"openai", "anthropic", "gemini", "groq"};
        for (String k : defaultKeys) {
            masked.putIfAbsent(k, null);
        }
        
        return masked;
    }
}
