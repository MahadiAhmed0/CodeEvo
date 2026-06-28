package com.codeevo.github.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_github_links")
public class ProjectGitHubLink {

    @Id
    private String id;

    private String projectId;

    private String userId;

    private String repoOwner;

    private String repoName;

    private String fullName;

    private String defaultBranch;

    private String activeBranch;

    private String webhookId;

    @Builder.Default
    private Instant linkedAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    /** Commit SHA of the last successful push to this repo+branch */
    private String lastPushedCommitSha;

    /** Timestamp of the last successful push */
    private Instant lastPushedAt;

    /** File entries from the last successful push (list avoids MongoDB dot-in-key issues) */
    private List<FileEntry> lastPushedFiles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileEntry {
        private String path;
        private String sha;
    }
}
