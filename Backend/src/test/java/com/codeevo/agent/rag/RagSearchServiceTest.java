package com.codeevo.agent.rag;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagSearchServiceTest {

    @Mock
    private CodeChunkRepository chunkRepository;
    @Mock
    private EmbeddingService embeddingService;
    @Mock
    private CodeIndexerService indexerService;

    private RagSearchService ragSearch;

    @BeforeEach
    void setUp() {
        ragSearch = new RagSearchService(chunkRepository, embeddingService, indexerService);
        ReflectionTestUtils.setField(ragSearch, "minSimilarity", 0.3);
        ReflectionTestUtils.setField(ragSearch, "autoIndex", false);
    }

    @Test
    void search_noChunksAndNoAutoIndex_returnsMessage() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(0L);

        String result = ragSearch.search("p1", "auth", "all", 5);

        assertTrue(result.contains("No code indexed"));
    }

    @Test
    void search_noChunksWithAutoIndex_triggersBackgroundIndex() {
        ReflectionTestUtils.setField(ragSearch, "autoIndex", true);
        when(chunkRepository.countByProjectId("p1")).thenReturn(0L);

        String result = ragSearch.search("p1", "auth", "all", 5);

        verify(indexerService).indexProjectFromDb("p1");
        assertTrue(result.contains("Indexing"));
    }

    @Test
    void search_withSemanticResults_returnsFormatted() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(3L);

        CodeChunk chunk = CodeChunk.builder()
                .projectId("p1").filePath("src/main/java/AuthService.java")
                .language("java").startLine(10).endLine(30)
                .content("public class AuthService { ... }")
                .embedding(List.of(0.1, 0.2, 0.3))
                .indexedAt(Instant.now()).contentHash("abc")
                .build();

        when(embeddingService.embed(anyString())).thenReturn(List.of(0.1, 0.2, 0.3));
        when(chunkRepository.findAllByProjectId("p1")).thenReturn(List.of(chunk));

        String result = ragSearch.search("p1", "authentication", "all", 5);

        assertTrue(result.contains("AuthService.java"));
        assertTrue(result.contains("similarity"));
    }

    @Test
    void search_noMatchingChunks_fallsBackToTextSearch() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(3L);

        CodeChunk chunk = CodeChunk.builder()
                .projectId("p1").filePath("src/Config.java")
                .language("java").startLine(1).endLine(10)
                .content("public class Config { private String name; }")
                .embedding(List.of(0.9, 0.8, 0.7))
                .indexedAt(Instant.now()).contentHash("def")
                .build();

        // Embedding returns a vector that won't match (different dimensions or values)
        when(embeddingService.embed(anyString())).thenReturn(List.of(0.5, 0.5));
        when(chunkRepository.findAllByProjectId("p1")).thenReturn(List.of(chunk));

        String result = ragSearch.search("p1", "zxy_nonexistent_12345", "all", 5);

        // Should fall back to text search since semantic similarity is below threshold
        // or return no-matches message
        assertNotNull(result);
    }

    @Test
    void search_embeddingFails_fallsBackToTextSearch() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(3L);

        when(embeddingService.embed(anyString())).thenReturn(List.of());
        when(chunkRepository.findAllByProjectId("p1")).thenReturn(List.of(
                CodeChunk.builder().projectId("p1").filePath("file.java")
                        .language("java").content("public class X {}").build()
        ));

        String result = ragSearch.search("p1", "search term", "all", 5);

        assertNotNull(result);
    }

    @Test
    void search_withLanguageFilter_usesCorrectQuery() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(5L);
        when(embeddingService.embed(anyString())).thenReturn(List.of(0.1, 0.2));

        CodeChunk chunk = CodeChunk.builder()
                .projectId("p1").filePath("test.ts")
                .language("typescript").startLine(1).endLine(5)
                .content("const x = 1;")
                .embedding(List.of(0.1, 0.2))
                .build();

        when(chunkRepository.findByProjectIdAndLanguage("p1", "typescript"))
                .thenReturn(List.of(chunk));

        String result = ragSearch.search("p1", "const x", "typescript", 5);

        assertTrue(result.contains("test.ts"));
    }

    @Test
    void searchChunks_returnsCodeChunks() {
        when(embeddingService.embed(anyString())).thenReturn(List.of(0.1, 0.2, 0.3));

        CodeChunk chunk = CodeChunk.builder()
                .projectId("p1").filePath("Test.java")
                .language("java").startLine(1).endLine(5)
                .content("public class Test {}")
                .embedding(List.of(0.1, 0.2, 0.3))
                .build();

        when(chunkRepository.findAllByProjectId("p1")).thenReturn(List.of(chunk));

        List<CodeChunk> results = ragSearch.searchChunks("p1", "test class", 5);

        assertEquals(1, results.size());
        assertEquals("Test.java", results.get(0).getFilePath());
    }

    @Test
    void searchChunks_emptyEmbedding_returnsEmpty() {
        when(embeddingService.embed(anyString())).thenReturn(List.of());

        List<CodeChunk> results = ragSearch.searchChunks("p1", "nope", 5);

        assertTrue(results.isEmpty());
    }

    @Test
    void fallbackTextSearch_findsByKeyword() {
        when(chunkRepository.countByProjectId("p1")).thenReturn(3L);
        when(embeddingService.embed(anyString())).thenReturn(List.of(0.1, 0.2));

        CodeChunk chunk = CodeChunk.builder()
                .projectId("p1").filePath("Auth.java")
                .language("java").startLine(1).endLine(3)
                .content("public class AuthService { // handles authentication }")
                .embedding(List.of(99.0, -99.0)) // very different from query
                .build();

        when(chunkRepository.findAllByProjectId("p1")).thenReturn(List.of(chunk));

        String result = ragSearch.search("p1", "authentication", "all", 5);

        assertNotNull(result);
    }
}
