package com.codeevo.project.util;

import com.codeevo.project.exception.InvalidDiagramJsonException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

    public String normalizeForMainGateway(String diagramJson) {
        JsonNode rootNode = parseAndValidate(diagramJson);
        if (!(rootNode instanceof ObjectNode rootObject) || !rootObject.has("nodes") || !rootObject.get("nodes").isArray()) {
            return diagramJson;
        }

        ObjectNode normalizedRoot = rootObject.deepCopy();
        for (JsonNode node : normalizedRoot.get("nodes")) {
            JsonNode dataNode = node.get("data");
            if (!(dataNode instanceof ObjectNode dataObject)) {
                continue;
            }

            String type = dataObject.path("type").asText();
            if ("service".equals(type)) {
                dataObject.remove("language");
                dataObject.remove("port");
                continue;
            }

            if ("api".equals(type)) {
                if (!dataObject.hasNonNull("name") || dataObject.path("name").asText().isBlank()) {
                    dataObject.put("name", "MainGateway");
                }
                if (!dataObject.hasNonNull("port")) {
                    dataObject.put("port", 8080);
                }
                normalizeGatewayConfig(dataObject);
            }
        }

        try {
            return objectMapper.writeValueAsString(normalizedRoot);
        } catch (JsonProcessingException e) {
            throw new InvalidDiagramJsonException("Invalid JSON format");
        }
    }

    private void normalizeGatewayConfig(ObjectNode dataObject) {
        JsonNode gatewayConfig = dataObject.get("gatewayConfig");
        ObjectNode gatewayObject;
        if (gatewayConfig instanceof ObjectNode existingGatewayObject) {
            gatewayObject = existingGatewayObject;
        } else {
            gatewayObject = objectMapper.createObjectNode();
            dataObject.set("gatewayConfig", gatewayObject);
        }

        if (!gatewayObject.hasNonNull("language")) {
            gatewayObject.put("language", mapLegacyPlatformToLanguage(gatewayObject.path("platform").asText(null)));
        }
        gatewayObject.remove("platform");

        JsonNode routes = gatewayObject.get("routes");
        if (routes != null && routes.isArray()) {
            for (JsonNode route : routes) {
                if (route instanceof ObjectNode routeObject) {
                    routeObject.remove("targetPort");
                }
            }
        }
    }

    private String mapLegacyPlatformToLanguage(String platform) {
        if ("express-proxy".equals(platform)) {
            return "node.js";
        }
        if ("spring-cloud-gateway".equals(platform)) {
            return "spring-boot";
        }
        return "spring-boot";
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
