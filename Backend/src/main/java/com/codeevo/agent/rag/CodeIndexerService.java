package com.codeevo.agent.rag;

import com.codeevo.project.entity.ProjectCode;
import com.codeevo.project.repository.ProjectCodeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

/**
 * Phase 2: Code Indexer Service
 *
 * Walks the project's working directory, chunks source files by logical
 * boundaries (class/function level), generates embeddings, and persists
 * them as {@link CodeChunk} documents in MongoDB.
 *
 * Chunking Strategy (Tree-sitter-lite):
 *   Since embedding Tree-sitter as a JNI lib adds build complexity, we use
 *   a simpler but effective heuristic chunker that finds logical boundaries:
 *   - Java:   split on top-level method/class declarations
 *   - TS/TSX: split on export const/function/class declarations
 *   - Config: treat each file as one chunk
 *
 * The chunker is designed to be incrementally replaceable with real
 * Tree-sitter via graalvm-js or a sidecar service.
 *
 * Indexing is idempotent: files are skipped if their SHA-256 hash hasn't changed.
 */
@Slf4j
@Service
public class CodeIndexerService {

    private final CodeChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;
    private final ProjectCodeRepository projectCodeRepository;

    @Value("${codeevo.project.base-path:#{null}}")
    private String configuredBasePath;

    // Maximum characters per chunk before we force-split
    private static final int MAX_CHUNK_CHARS = 1500;

    // Minimum characters for a chunk to be worth indexing
    private static final int MIN_CHUNK_CHARS = 60;

    public CodeIndexerService(CodeChunkRepository chunkRepository, EmbeddingService embeddingService,
                              ProjectCodeRepository projectCodeRepository) {
        this.chunkRepository = chunkRepository;
        this.embeddingService = embeddingService;
        this.projectCodeRepository = projectCodeRepository;
    }

    /**
     * Full re-index of all source files for a project FROM MONGODB.
     *
     * Reads all {@link ProjectCode} documents for the project and builds
     * semantic embeddings for each file. This is the primary indexing path
     * used when auto-index triggers on a chat query.
     *
     * This is idempotent — existing chunks are deleted and rebuilt.
     */
    @Async
    public void indexProjectFromDb(String projectId) {
        log.info("Starting DB-based re-index for project {}", projectId);
        long start = System.currentTimeMillis();

        List<ProjectCode> files = projectCodeRepository.findByProjectIdOrderByFilePathAsc(projectId);
        if (files.isEmpty()) {
            log.info("Project {} has no code files in MongoDB — skipping RAG index.", projectId);
            return;
        }

        chunkRepository.deleteAllByProjectId(projectId);

        int totalChunks = 0;
        for (ProjectCode file : files) {
            try {
                totalChunks += indexFileContent(projectId, file.getFilePath(),
                        file.getContent(), file.getLanguage());
            } catch (Exception e) {
                log.warn("Failed to index DB file {}: {}", file.getFilePath(), e.getMessage());
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("DB indexing complete for project {}: {} chunks from {} files in {}ms",
                projectId, totalChunks, files.size(), elapsed);
    }

    /**
     * Full re-index of all source files for a project FROM FILESYSTEM.
     * Only used when a localBasePath is explicitly configured.
     * Deletes all existing chunks and rebuilds from scratch.
     * Runs asynchronously so it doesn't block the HTTP request.
     */
    @Async
    public void indexProject(String projectId, String projectBasePath) {
        Path base = resolveBase(projectBasePath);
        if (base == null) {
            log.warn("No base path configured for project {}. Use indexProjectFromDb instead.", projectId);
            return;
        }

        log.info("Starting full re-index for project {} at {}", projectId, base);
        long start = System.currentTimeMillis();

        chunkRepository.deleteAllByProjectId(projectId);

        List<Path> files = collectIndexableFiles(base);
        log.info("Found {} indexable files for project {}", files.size(), projectId);

        int totalChunks = 0;
        for (Path file : files) {
            try {
                totalChunks += indexFile(projectId, base, file, false);
            } catch (Exception e) {
                log.warn("Failed to index file {}: {}", file, e.getMessage());
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("Indexing complete for project {}: {} chunks in {}ms", projectId, totalChunks, elapsed);
    }

    /**
     * Incremental re-index: only updates chunks for files whose content has changed.
     * Much faster for frequent auto-indexing on file save.
     */
    @Async
    public void indexFileIncremental(String projectId, String projectBasePath, String relativeFilePath) {
        Path base = resolveBase(projectBasePath);
        if (base == null) return;

        Path file = base.resolve(relativeFilePath);
        if (!Files.exists(file)) {
            chunkRepository.deleteAllByProjectIdAndFilePath(projectId, relativeFilePath);
            return;
        }

        try {
            indexFile(projectId, base, file, true);
        } catch (Exception e) {
            log.warn("Incremental index failed for {}: {}", relativeFilePath, e.getMessage());
        }
    }

    /**
     * Returns the total number of indexed chunks for a project.
     */
    public long getIndexedChunkCount(String projectId) {
        return chunkRepository.countByProjectId(projectId);
    }

    // ─── Private Implementation ───────────────────────────────────────────────

    private int indexFileContent(String projectId, String filePath, String content, String language) {
        if (content == null || content.isBlank()) return 0;

        String hash = sha256(content);
        String lang = language != null ? language : "text";

        // Skip if unchanged
        List<CodeChunk> existing = chunkRepository.findAllByProjectIdAndFilePath(projectId, filePath);
        if (!existing.isEmpty() && hash.equals(existing.get(0).getContentHash())) {
            return existing.size();
        }
        chunkRepository.deleteAllByProjectIdAndFilePath(projectId, filePath);

        List<String[]> chunks = chunkFile(content, lang);
        List<String> texts = chunks.stream().map(c -> c[2]).toList();
        List<List<Double>> embeddings = embeddingService.embedBatch(texts);

        List<CodeChunk> documents = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            String[] chunk = chunks.get(i);
            List<Double> embedding = i < embeddings.size() ? embeddings.get(i) : List.of();
            documents.add(CodeChunk.builder()
                    .projectId(projectId)
                    .filePath(filePath)
                    .language(lang)
                    .startLine(Integer.parseInt(chunk[0]))
                    .endLine(Integer.parseInt(chunk[1]))
                    .content(chunk[2])
                    .embedding(embedding)
                    .contentHash(hash)
                    .indexedAt(Instant.now())
                    .build());
        }
        chunkRepository.saveAll(documents);
        log.debug("Indexed {} chunks for DB file {}", documents.size(), filePath);
        return documents.size();
    }

    private int indexFile(String projectId, Path base, Path file, boolean incremental) throws IOException {
        String relPath = base.relativize(file).toString().replace('\\', '/');
        String language = detectLanguage(file);
        String content = Files.readString(file, StandardCharsets.UTF_8);
        return indexFileContent(projectId, relPath, content, language);
    }

    /**
     * Heuristic chunker — splits a source file into logical chunks.
     * Returns a list of [startLine, endLine, content] string arrays.
     */
    private List<String[]> chunkFile(String content, String language) {
        String[] lines = content.split("\n", -1);
        List<String[]> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int chunkStart = 1;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            current.append(line).append("\n");

            boolean isBoundary = isLogicalBoundary(line, language);
            boolean tooLong = current.length() >= MAX_CHUNK_CHARS;

            if ((isBoundary && current.length() > MIN_CHUNK_CHARS) || tooLong) {
                // Flush current chunk
                String text = current.toString().strip();
                if (text.length() >= MIN_CHUNK_CHARS) {
                    chunks.add(new String[]{String.valueOf(chunkStart), String.valueOf(i + 1), text});
                }
                current.setLength(0);
                chunkStart = i + 2; // next chunk starts on the next line
            }
        }

        // Flush any remainder
        String remaining = current.toString().strip();
        if (remaining.length() >= MIN_CHUNK_CHARS) {
            chunks.add(new String[]{String.valueOf(chunkStart), String.valueOf(lines.length), remaining});
        }

        // If no chunks produced (e.g., tiny config file), treat whole file as one chunk
        if (chunks.isEmpty() && content.strip().length() >= MIN_CHUNK_CHARS) {
            chunks.add(new String[]{"1", String.valueOf(lines.length), content.strip()});
        }

        return chunks;
    }

    /**
     * Detects logical chunk boundaries based on language-specific patterns.
     * This is the "Tree-sitter-lite" heuristic.
     */
    private boolean isLogicalBoundary(String line, String language) {
        String trimmed = line.stripLeading();
        return switch (language) {
            case "java" -> trimmed.matches("(public|private|protected|static|abstract).*\\{\\s*") ||
                           trimmed.startsWith("@") && trimmed.endsWith("{") ||
                           trimmed.matches(".*class\\s+\\w+.*\\{\\s*");

            case "typescript", "javascript" ->
                trimmed.startsWith("export ") ||
                trimmed.startsWith("function ") ||
                trimmed.startsWith("const ") && trimmed.contains("=>") ||
                trimmed.startsWith("class ");

            case "python" ->
                trimmed.startsWith("def ") || trimmed.startsWith("class ") || trimmed.startsWith("async def ");

            default ->
                // For config/yaml: chunk on blank lines between sections
                trimmed.isEmpty();
        };
    }

    private List<Path> collectIndexableFiles(Path base) {
        List<Path> files = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(base)) {
            walk.filter(Files::isRegularFile)
                .filter(this::isIndexable)
                .forEach(files::add);
        } catch (IOException e) {
            log.warn("Error walking directory {}: {}", base, e.getMessage());
        }
        return files;
    }

    private boolean isIndexable(Path path) {
        String str = path.toString().replace('\\', '/');
        // Exclude build artifacts, deps, and hidden dirs
        if (str.contains("/target/") || str.contains("/node_modules/") ||
            str.contains("/.next/") || str.contains("/.git/") ||
            str.contains("/.idea/") || str.contains("/.gradle/")) {
            return false;
        }
        String name = path.getFileName().toString().toLowerCase();
        return name.endsWith(".java") || name.endsWith(".ts") || name.endsWith(".tsx") ||
               name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".py") ||
               name.endsWith(".properties") || name.endsWith(".yml") || name.endsWith(".yaml") ||
               name.endsWith(".md") || name.endsWith(".json") && !name.equals("package-lock.json");
    }

    private String detectLanguage(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".java"))                          return "java";
        if (name.endsWith(".ts") || name.endsWith(".tsx"))  return "typescript";
        if (name.endsWith(".js") || name.endsWith(".jsx"))  return "javascript";
        if (name.endsWith(".py"))                            return "python";
        if (name.endsWith(".properties"))                   return "properties";
        if (name.endsWith(".yml") || name.endsWith(".yaml"))return "yaml";
        if (name.endsWith(".md"))                            return "markdown";
        if (name.endsWith(".json"))                          return "json";
        return "text";
    }

    private Path resolveBase(String basePath) {
        // Never fall back to user.dir — that would index CodeEvo's own source code!
        if (basePath != null && !basePath.isBlank()) return Paths.get(basePath);
        if (configuredBasePath != null && !configuredBasePath.isBlank()) return Paths.get(configuredBasePath);
        return null; // No filesystem path → caller should use indexProjectFromDb() instead
    }

    private static String sha256(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return String.valueOf(text.hashCode());
        }
    }
}
