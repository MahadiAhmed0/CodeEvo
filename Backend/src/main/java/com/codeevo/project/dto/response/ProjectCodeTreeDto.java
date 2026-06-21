package com.codeevo.project.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Hierarchical file-tree response for the frontend code viewer.
 * <p>
 * Each node is either a "file" (leaf) carrying content, or a "folder"
 * (internal node) carrying children.  The tree is built from the flat
 * list of {@link com.codeevo.project.entity.ProjectCode} documents
 * so the frontend can render an Explorer-style sidebar without doing
 * any path-splitting itself.
 * </p>
 */
@Data
@Builder
public class ProjectCodeTreeDto {

    /** Total number of files in this project. */
    private long totalFiles;

    /** Total size (bytes) across all files. */
    private long totalSizeBytes;

    /** Root-level children (folders and files). */
    private Map<String, TreeNode> tree;

    @Data
    @Builder
    public static class TreeNode {
        /** "file" or "folder" */
        private String type;
        private String name;

        // --- file-only fields ---
        private String filePath;
        private String content;
        private String language;

        // --- folder-only field ---
        private Map<String, TreeNode> children;
    }
}
