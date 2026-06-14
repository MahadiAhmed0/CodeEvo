package com.codeevo.project.util;

import org.springframework.stereotype.Component;

import java.nio.file.InvalidPathException;
import java.nio.file.Path;

/**
 * Validates and normalises relative file paths to prevent
 * directory-traversal attacks (e.g. "../../etc/passwd").
 * <p>
 * Rules enforced:
 * <ul>
 *   <li>No null / blank paths</li>
 *   <li>No leading slash (absolute paths)</li>
 *   <li>No ".." segments</li>
 *   <li>No backslashes (Windows escape)</li>
 *   <li>No NUL bytes</li>
 *   <li>Normalised path must stay within the virtual root</li>
 *   <li>Maximum depth of 20 segments</li>
 * </ul>
 */
@Component
public class FilePathValidator {

    private static final int MAX_PATH_DEPTH = 20;

    /**
     * Validates the path and returns the normalised form (forward-slashes, no trailing slash).
     *
     * @throws IllegalArgumentException if the path is unsafe
     */
    public String validateAndNormalize(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            throw new IllegalArgumentException("File path must not be blank");
        }

        // Reject NUL bytes
        if (filePath.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("File path contains illegal NUL character");
        }

        // Reject backslashes
        if (filePath.contains("\\")) {
            throw new IllegalArgumentException("File path must use forward slashes only");
        }

        // Reject absolute paths
        if (filePath.startsWith("/")) {
            throw new IllegalArgumentException("File path must be relative (no leading slash)");
        }

        // Reject ".." segments
        for (String segment : filePath.split("/")) {
            if ("..".equals(segment)) {
                throw new IllegalArgumentException("File path must not contain '..' segments");
            }
        }

        // Normalise via java.nio.file.Path
        try {
            Path normalised = Path.of(filePath).normalize();

            // After normalising, if ".." still appears, the path escapes the root
            if (normalised.startsWith("..")) {
                throw new IllegalArgumentException("File path must not escape the project root");
            }

            String result = normalised.toString().replace('\\', '/');

            // Remove trailing slash
            if (result.endsWith("/")) {
                result = result.substring(0, result.length() - 1);
            }

            // Depth check
            if (result.split("/").length > MAX_PATH_DEPTH) {
                throw new IllegalArgumentException("File path exceeds maximum depth of " + MAX_PATH_DEPTH);
            }

            return result;
        } catch (InvalidPathException e) {
            throw new IllegalArgumentException("Invalid file path: " + e.getMessage());
        }
    }
}
