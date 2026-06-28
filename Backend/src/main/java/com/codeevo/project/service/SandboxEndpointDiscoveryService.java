package com.codeevo.project.service;

import com.codeevo.project.dto.response.SandboxEndpointDto;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SandboxEndpointDiscoveryService {

    private static final Pattern CLASS_MAPPING = Pattern.compile("@RequestMapping\\s*\\(([^)]*)\\)[\\s\\S]{0,500}?(?:public\\s+)?class\\s+\\w+");
    private static final Pattern METHOD_MAPPING = Pattern.compile("@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\\s*(?:\\(([^)]*)\\))?[\\s\\S]{0,700}?(?:public|private|protected)?\\s+[\\w<>.?\\[\\],\\s]+\\s+(\\w+)\\s*\\(");
    private static final Pattern STRING_VALUE = Pattern.compile("\"([^\"]*)\"");
    private static final Pattern REQUEST_METHOD = Pattern.compile("RequestMethod\\.(GET|POST|PUT|DELETE|PATCH)", Pattern.CASE_INSENSITIVE);

    private final ProjectCodeRepository codeRepository;

    public List<SandboxEndpointDto> discover(String projectId) {
        List<ProjectCode> files = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);
        Map<String, SandboxEndpointDto> endpoints = new LinkedHashMap<>();

        for (ProjectCode file : files) {
            String filePath = file.getFilePath();
            String content = file.getContent();
            if (filePath == null || content == null) continue;
            if (filePath.endsWith(".java")) {
                discoverSpringEndpoints(filePath, content, endpoints);
            } else if (filePath.endsWith(".js") || filePath.endsWith(".ts")) {
                discoverExpressEndpoints(filePath, content, endpoints);
            }
        }

        return new ArrayList<>(endpoints.values());
    }

    private void discoverSpringEndpoints(String filePath, String content, Map<String, SandboxEndpointDto> endpoints) {
        if (!content.contains("@RestController") && !content.contains("@Controller")) return;

        String basePath = "";
        Matcher classMatcher = CLASS_MAPPING.matcher(content);
        if (classMatcher.find()) {
            basePath = extractFirstPath(classMatcher.group(1));
        }

        Matcher methodMatcher = METHOD_MAPPING.matcher(content);
        while (methodMatcher.find()) {
            String annotation = methodMatcher.group(1);
            String args = methodMatcher.group(2) == null ? "" : methodMatcher.group(2);
            String methodName = methodMatcher.group(3);
            String httpMethod = httpMethodFor(annotation, args);
            String methodPath = extractFirstPath(args);
            String fullPath = normalizePath(basePath, methodPath);
            addEndpoint(endpoints, httpMethod, fullPath, "controller", filePath, methodName);
        }
    }

    private void discoverExpressEndpoints(String filePath, String content, Map<String, SandboxEndpointDto> endpoints) {
        Pattern express = Pattern.compile("\\b(?:app|router)\\.(get|post|put|delete|patch)\\s*\\(\\s*['\"]([^'\"]+)['\"]", Pattern.CASE_INSENSITIVE);
        Matcher matcher = express.matcher(content);
        while (matcher.find()) {
            addEndpoint(endpoints, matcher.group(1).toUpperCase(Locale.ROOT), matcher.group(2), "controller", filePath, "Express route");
        }
    }

    private String httpMethodFor(String annotation, String args) {
        return switch (annotation) {
            case "PostMapping" -> "POST";
            case "PutMapping" -> "PUT";
            case "DeleteMapping" -> "DELETE";
            case "PatchMapping" -> "PATCH";
            case "RequestMapping" -> {
                Matcher matcher = REQUEST_METHOD.matcher(args);
                yield matcher.find() ? matcher.group(1).toUpperCase(Locale.ROOT) : "GET";
            }
            default -> "GET";
        };
    }

    private String extractFirstPath(String args) {
        if (args == null || args.isBlank()) return "";
        Matcher matcher = STRING_VALUE.matcher(args);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String normalizePath(String basePath, String methodPath) {
        String base = cleanPath(basePath);
        String method = cleanPath(methodPath);
        if (base.equals("/")) base = "";
        if (method.equals("/")) method = "";
        String combined = (base + "/" + method).replaceAll("/{2,}", "/");
        return combined.isBlank() ? "/" : cleanPath(combined);
    }

    private String cleanPath(String path) {
        if (path == null || path.isBlank()) return "";
        String cleaned = path.trim();
        if (!cleaned.startsWith("/")) cleaned = "/" + cleaned;
        return cleaned.replaceAll("/{2,}", "/");
    }

    private void addEndpoint(Map<String, SandboxEndpointDto> endpoints, String method, String path, String source, String filePath, String summary) {
        String normalizedMethod = method == null || method.isBlank() ? "GET" : method.toUpperCase(Locale.ROOT);
        String normalizedPath = cleanPath(path);
        String key = normalizedMethod + " " + normalizedPath;
        endpoints.putIfAbsent(key, SandboxEndpointDto.builder()
            .id("controller-" + Integer.toHexString(key.hashCode()))
            .method(normalizedMethod)
            .path(normalizedPath)
            .source(source)
            .filePath(filePath)
            .summary(summary)
            .requestBodyExample(requestBodyExampleFor(normalizedMethod, normalizedPath))
            .build());
    }

    private Object requestBodyExampleFor(String method, String path) {
        if (!method.equals("POST") && !method.equals("PUT") && !method.equals("PATCH")) {
            return null;
        }

        String normalizedPath = path.toLowerCase(Locale.ROOT);
        Map<String, Object> example = new LinkedHashMap<>();

        if (normalizedPath.contains("user")) {
            example.put("name", "Test User");
            example.put("email", "test@example.com");
            example.put("password", "password123");
            return example;
        }

        if (normalizedPath.contains("product")) {
            example.put("name", "Test Product");
            example.put("price", 99.99);
            example.put("description", "A test product");
            return example;
        }

        if (normalizedPath.contains("order")) {
            example.put("productId", "11111111-1111-4111-8111-111111111111");
            example.put("quantity", 2);
            example.put("status", "PENDING");
            return example;
        }

        example.put("name", "Test Item");
        example.put("description", "Generated API test payload");
        return example;
    }
}
