package com.codeevo.project.service;

import com.codeevo.project.dto.request.BulkUpsertCodeFilesRequest;
import com.codeevo.project.dto.request.UpsertCodeFileRequest;
import com.codeevo.project.dto.response.ProjectCodeFileDto;
import com.codeevo.project.dto.response.ProjectCodeTreeDto;
import com.codeevo.project.dto.response.ProjectCodeTreeDto.TreeNode;
import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.exception.CodePayloadTooLargeException;
import com.codeevo.project.exception.ProjectNotFoundException;
import com.codeevo.project.repository.ProjectCodeRepository;
import com.codeevo.project.security.ProjectOwnershipValidator;
import com.codeevo.project.util.FilePathValidator;
import com.codeevo.project.util.SanitizerUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Service handling all CRUD operations for project code files,
 * hierarchical tree building, and ZIP archive generation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectCodeService {

    private final ProjectCodeRepository codeRepository;
    private final ProjectOwnershipValidator ownershipValidator;
    private final ProjectAuditService auditService;
    private final FilePathValidator filePathValidator;
    private final SanitizerUtil sanitizer;

    /** Maximum number of files allowed per project. */
    @Value("${codeevo.project.code-max-files:2000}")
    private long maxFilesPerProject;

    /** Maximum total payload size for a single bulk upsert (10 MB). */
    @Value("${codeevo.project.code-bulk-max-bytes:10485760}")
    private long maxBulkPayloadBytes;

    // ─── Single file upsert ──────────────────────────────────────────────────

    /**
     * Create or update a single code file.  If a file with the same path
     * already exists it is updated in-place; otherwise a new document is created.
     */
    @Transactional
    public ProjectCodeFileDto upsertFile(
            String projectId, String userId,
            UpsertCodeFileRequest request,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "UPSERT_CODE", ipAddress, userAgent);

        String normalizedPath = filePathValidator.validateAndNormalize(request.getFilePath());
        String content = request.getContent() != null ? request.getContent() : "";
        long size = content.getBytes(StandardCharsets.UTF_8).length;

        Optional<ProjectCode> existing = codeRepository.findByProjectIdAndFilePath(projectId, normalizedPath);

        ProjectCode entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setContent(content);
            entity.setLanguage(request.getLanguage());
            entity.setSizeBytes(size);
            entity.setUpdatedAt(Instant.now());
        } else {
            // Quota check
            if (codeRepository.countByProjectId(projectId) >= maxFilesPerProject) {
                throw new CodePayloadTooLargeException(
                        "Project has reached the maximum of " + maxFilesPerProject + " code files");
            }
            entity = ProjectCode.builder()
                    .projectId(projectId)
                    .filePath(normalizedPath)
                    .content(content)
                    .language(request.getLanguage())
                    .sizeBytes(size)
                    .build();
        }

        entity = codeRepository.save(entity);
        auditService.log(userId, projectId, "UPSERT_CODE", normalizedPath, ipAddress, userAgent);
        return mapToDto(entity);
    }

    // ─── Bulk upsert ─────────────────────────────────────────────────────────

    /**
     * Upsert many files in a single request (agent-friendly).
     * Validates total payload size and per-project file quota.
     */
    @Transactional
    public List<ProjectCodeFileDto> bulkUpsertFiles(
            String projectId, String userId,
            BulkUpsertCodeFilesRequest request,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "BULK_UPSERT_CODE", ipAddress, userAgent);

        // Total payload size guard
        long totalBytes = request.getFiles().stream()
                .mapToLong(f -> (f.getContent() != null ? f.getContent() : "").getBytes(StandardCharsets.UTF_8).length)
                .sum();
        if (totalBytes > maxBulkPayloadBytes) {
            throw new CodePayloadTooLargeException(
                    "Bulk payload size (" + totalBytes + " bytes) exceeds limit of " + maxBulkPayloadBytes + " bytes");
        }

        List<ProjectCodeFileDto> results = new ArrayList<>();

        for (UpsertCodeFileRequest fileReq : request.getFiles()) {
            String normalizedPath = filePathValidator.validateAndNormalize(fileReq.getFilePath());
            String content = fileReq.getContent() != null ? fileReq.getContent() : "";
            long size = content.getBytes(StandardCharsets.UTF_8).length;

            Optional<ProjectCode> existing = codeRepository.findByProjectIdAndFilePath(projectId, normalizedPath);

            ProjectCode entity;
            if (existing.isPresent()) {
                entity = existing.get();
                entity.setContent(content);
                entity.setLanguage(fileReq.getLanguage());
                entity.setSizeBytes(size);
                entity.setUpdatedAt(Instant.now());
            } else {
                if (codeRepository.countByProjectId(projectId) >= maxFilesPerProject) {
                    throw new CodePayloadTooLargeException(
                            "Project has reached the maximum of " + maxFilesPerProject + " code files");
                }
                entity = ProjectCode.builder()
                        .projectId(projectId)
                        .filePath(normalizedPath)
                        .content(content)
                        .language(fileReq.getLanguage())
                        .sizeBytes(size)
                        .build();
            }

            entity = codeRepository.save(entity);
            results.add(mapToDto(entity));
        }

        auditService.log(userId, projectId, "BULK_UPSERT_CODE",
                results.size() + " files", ipAddress, userAgent);
        return results;
    }

    // ─── Read: flat list ─────────────────────────────────────────────────────

    /**
     * Retrieve every code file for a project as a flat list.
     */
    public List<ProjectCodeFileDto> getFiles(
            String projectId, String userId,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "READ_CODE", ipAddress, userAgent);

        return codeRepository.findByProjectIdOrderByFilePathAsc(projectId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    // ─── Read: hierarchical tree ─────────────────────────────────────────────

    /**
     * Build a hierarchical tree from the flat file list.
     * The frontend can render this directly in its Explorer panel.
     */
    public ProjectCodeTreeDto getFileTree(
            String projectId, String userId,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "READ_CODE", ipAddress, userAgent);

        List<ProjectCode> files = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);

        Map<String, TreeNode> root = new LinkedHashMap<>();
        long totalSize = 0;

        for (ProjectCode file : files) {
            totalSize += file.getSizeBytes();
            String[] segments = file.getFilePath().split("/");

            // Walk / create intermediate folders
            Map<String, TreeNode> current = root;
            for (int i = 0; i < segments.length - 1; i++) {
                String folderName = segments[i];
                current.computeIfAbsent(folderName, k ->
                        TreeNode.builder()
                                .type("folder")
                                .name(k)
                                .children(new LinkedHashMap<>())
                                .build()
                );
                current = current.get(folderName).getChildren();
            }

            // Add the file leaf
            String fileName = segments[segments.length - 1];
            current.put(fileName, TreeNode.builder()
                    .type("file")
                    .name(fileName)
                    .filePath(file.getFilePath())
                    .content(file.getContent())
                    .language(file.getLanguage())
                    .build());
        }

        return ProjectCodeTreeDto.builder()
                .totalFiles(files.size())
                .totalSizeBytes(totalSize)
                .tree(root)
                .build();
    }

    // ─── Delete single file ──────────────────────────────────────────────────

    @Transactional
    public void deleteFile(
            String projectId, String codeId, String userId,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "DELETE_CODE", ipAddress, userAgent);

        ProjectCode entity = codeRepository.findById(codeId)
                .orElseThrow(() -> new ProjectNotFoundException("Code file not found: " + codeId));

        if (!entity.getProjectId().equals(projectId)) {
            throw new ProjectNotFoundException("Code file not found for this project");
        }

        codeRepository.delete(entity);
        auditService.log(userId, projectId, "DELETE_CODE", entity.getFilePath(), ipAddress, userAgent);
    }

    // ─── Delete all code files for a project ─────────────────────────────────

    @Transactional
    public void deleteAllFiles(
            String projectId, String userId,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "DELETE_ALL_CODE", ipAddress, userAgent);

        codeRepository.deleteByProjectId(projectId);
        auditService.log(userId, projectId, "DELETE_ALL_CODE", null, ipAddress, userAgent);
    }

    // ─── ZIP download ────────────────────────────────────────────────────────

    /**
     * Generate a ZIP archive containing every code file for the project.
     * Each file is placed at its full {@code filePath} within the archive.
     *
     * @return the raw bytes of the ZIP archive
     */
    public byte[] generateZipArchive(
            String projectId, String userId,
            String ipAddress, String userAgent) {

        ownershipValidator.getAndValidateOwnership(projectId, userId, "DOWNLOAD_CODE", ipAddress, userAgent);

        List<ProjectCode> files = codeRepository.findByProjectIdOrderByFilePathAsc(projectId);

        if (files.isEmpty()) {
            throw new ProjectNotFoundException("No code files to download for project: " + projectId);
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            Set<String> addedDirectories = new HashSet<>();

            for (ProjectCode file : files) {
                // Ensure parent directories are present as entries
                String path = file.getFilePath();
                String[] segments = path.split("/");
                StringBuilder dirBuilder = new StringBuilder();
                for (int i = 0; i < segments.length - 1; i++) {
                    dirBuilder.append(segments[i]).append("/");
                    String dirPath = dirBuilder.toString();
                    if (addedDirectories.add(dirPath)) {
                        zos.putNextEntry(new ZipEntry(dirPath));
                        zos.closeEntry();
                    }
                }

                // Write the file
                ZipEntry entry = new ZipEntry(path);
                zos.putNextEntry(entry);
                byte[] content = (file.getContent() != null)
                        ? file.getContent().getBytes(StandardCharsets.UTF_8)
                        : new byte[0];
                zos.write(content);
                zos.closeEntry();
            }

            zos.finish();
            auditService.log(userId, projectId, "DOWNLOAD_CODE",
                    files.size() + " files", ipAddress, userAgent);

            return baos.toByteArray();
        } catch (IOException e) {
            log.error("Failed to generate ZIP for project {}", projectId, e);
            throw new RuntimeException("Failed to generate ZIP archive", e);
        }
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private ProjectCodeFileDto mapToDto(ProjectCode entity) {
        return ProjectCodeFileDto.builder()
                .id(entity.getId())
                .projectId(entity.getProjectId())
                .filePath(entity.getFilePath())
                .content(entity.getContent())
                .language(entity.getLanguage())
                .sizeBytes(entity.getSizeBytes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
