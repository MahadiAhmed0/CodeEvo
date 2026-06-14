package com.codeevo.project.util;

import com.codeevo.project.exception.InvalidDiagramJsonException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class DiagramJsonValidator {

    private final ObjectMapper objectMapper;

    public DiagramJsonValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode parseAndValidate(String diagramJson) {
        if (diagramJson == null || diagramJson.isBlank()) {
            throw new InvalidDiagramJsonException("Diagram JSON cannot be empty");
        }
        try {
            return objectMapper.readTree(diagramJson);
        } catch (JsonProcessingException e) {
            throw new InvalidDiagramJsonException("Invalid JSON format");
        }
    }

    public int countServiceNodes(JsonNode rootNode) {
        if (rootNode == null || !rootNode.has("nodes")) {
            return 0;
        }

        JsonNode nodes = rootNode.get("nodes");
        if (!nodes.isArray()) {
            return 0;
        }

        int count = 0;
        for (JsonNode node : nodes) {
            // Node type is nested inside the "data" object: node.data.type
            JsonNode dataNode = node.get("data");
            if (dataNode != null && dataNode.has("type")
                    && "service".equals(dataNode.get("type").asText())) {
                count++;
            }
        }
        return count;
    }
}
