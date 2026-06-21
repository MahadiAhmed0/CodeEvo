package com.codeevo.project.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagramDiffService {

    private final ObjectMapper objectMapper;

    public DiffResult computeDiff(String oldJson, String newJson) {
        try {
            JsonNode oldTree = oldJson != null && !oldJson.isBlank() ? objectMapper.readTree(oldJson) : null;
            JsonNode newTree = newJson != null && !newJson.isBlank() ? objectMapper.readTree(newJson) : null;

            // Build maps of id -> name for nodes in each version
            Map<String, String> oldNodeMap = extractNodeMap(oldTree);
            Map<String, String> newNodeMap = extractNodeMap(newTree);

            int oldEdges = countArray(oldTree, "edges");
            int newEdges = countArray(newTree, "edges");

            int nodeDelta = newNodeMap.size() - oldNodeMap.size();
            int edgeDelta = newEdges - oldEdges;

            // Find added and removed node names
            Set<String> addedIds = new HashSet<>(newNodeMap.keySet());
            addedIds.removeAll(oldNodeMap.keySet());

            Set<String> removedIds = new HashSet<>(oldNodeMap.keySet());
            removedIds.removeAll(newNodeMap.keySet());

            List<String> addedNames = addedIds.stream()
                    .map(id -> newNodeMap.getOrDefault(id, id))
                    .collect(Collectors.toList());

            List<String> removedNames = removedIds.stream()
                    .map(id -> oldNodeMap.getOrDefault(id, id))
                    .collect(Collectors.toList());

            String message = generateMessage(addedNames, removedNames, nodeDelta, edgeDelta);

            return new DiffResult(nodeDelta, edgeDelta, message);
        } catch (Exception e) {
            log.warn("Failed to compute diagram diff, falling back to default", e);
            return new DiffResult(0, 0, "Updated diagram");
        }
    }

    /**
     * Extract a map of nodeId -> nodeName from the diagram JSON.
     * Node structure: { "id": "1", "data": { "name": "UserService", "type": "service" }, ... }
     */
    private Map<String, String> extractNodeMap(JsonNode root) {
        Map<String, String> map = new LinkedHashMap<>();
        if (root == null || !root.has("nodes") || !root.get("nodes").isArray()) {
            return map;
        }
        for (JsonNode node : root.get("nodes")) {
            String id = node.has("id") ? node.get("id").asText() : null;
            String name = null;
            if (node.has("data") && node.get("data").has("name")) {
                name = node.get("data").get("name").asText();
            }
            if (id != null) {
                map.put(id, name != null ? name : id);
            }
        }
        return map;
    }

    private int countArray(JsonNode root, String field) {
        if (root != null && root.has(field) && root.get(field).isArray()) {
            return root.get(field).size();
        }
        return 0;
    }

    private String generateMessage(List<String> addedNames, List<String> removedNames, int nodeDelta, int edgeDelta) {
        if (addedNames.isEmpty() && removedNames.isEmpty() && edgeDelta == 0) {
            return "Updated diagram properties";
        }

        List<String> parts = new ArrayList<>();

        if (!addedNames.isEmpty()) {
            parts.add("Added " + String.join(", ", addedNames));
        } else if (nodeDelta > 0) {
            parts.add("Added " + nodeDelta + " node(s)");
        }

        if (!removedNames.isEmpty()) {
            parts.add("Removed " + String.join(", ", removedNames));
        } else if (nodeDelta < 0) {
            parts.add("Removed " + Math.abs(nodeDelta) + " node(s)");
        }

        if (edgeDelta > 0) {
            parts.add("added " + edgeDelta + " connection(s)");
        } else if (edgeDelta < 0) {
            parts.add("removed " + Math.abs(edgeDelta) + " connection(s)");
        }

        return String.join(", ", parts);
    }

    public static class DiffResult {
        public final int nodeDelta;
        public final int edgeDelta;
        public final String message;

        public DiffResult(int nodeDelta, int edgeDelta, String message) {
            this.nodeDelta = nodeDelta;
            this.edgeDelta = edgeDelta;
            this.message = message;
        }
    }
}
