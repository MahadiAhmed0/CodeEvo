package com.codeevo.agent.document;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AgentSessionTest {

    @Test
    void builder_setsDefaults() {
        AgentSession session = AgentSession.builder()
                .id("s1").userId("u1").projectId("p1").build();

        assertEquals("s1", session.getId());
        assertEquals("u1", session.getUserId());
        assertEquals("p1", session.getProjectId());
        assertNotNull(session.getCreatedAt());
        assertNotNull(session.getUpdatedAt());
        assertTrue(session.isActive());
    }

    @Test
    void setAndGetActiveAgent() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1").build();
        session.setActiveAgent("CHAT");
        assertEquals("CHAT", session.getActiveAgent());
    }

    @Test
    void setAndGetSupervisorState() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1").build();
        session.setSupervisorState("ROUTING");
        assertEquals("ROUTING", session.getSupervisorState());
    }

    @Test
    void setAndGetModifiedFiles() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1")
                .modifiedFiles(List.of("file1.java", "file2.java")).build();
        assertEquals(2, session.getModifiedFiles().size());
        assertTrue(session.getModifiedFiles().contains("file1.java"));
    }

    @Test
    void toggleActive() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1").build();
        assertTrue(session.isActive());
        session.setActive(false);
        assertFalse(session.isActive());
    }

    @Test
    void setPendingApprovalToken() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1").build();
        session.setPendingApprovalToken("tok-123");
        assertEquals("tok-123", session.getPendingApprovalToken());
    }

    @Test
    void updatedAt_isMutable() {
        AgentSession session = AgentSession.builder().id("s1").userId("u1").projectId("p1").build();
        Instant later = Instant.now().plusSeconds(60);
        session.setUpdatedAt(later);
        assertEquals(later, session.getUpdatedAt());
    }
}
