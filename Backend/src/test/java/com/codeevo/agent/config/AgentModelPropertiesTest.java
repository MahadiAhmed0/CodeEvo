package com.codeevo.agent.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AgentModelPropertiesTest {

    @Test
    void defaults_shouldHaveSaneValues() {
        AgentModelProperties props = new AgentModelProperties();

        assertEquals("CodeEvo Supervisor", props.getSupervisor().getName());
        assertEquals(4096, props.getChat().getMaxTokens());
        assertEquals(0.3, props.getChat().getTemperature(), 0.001);
        assertEquals(3, props.getCoding().getMaxSelfCorrectionAttempts());
        assertEquals(10, props.getMemory().getWindowSize());
        assertEquals(15, props.getMemory().getSummarizeThreshold());
        assertEquals(3600, props.getCache().getTtlSeconds());
        assertEquals(86400, props.getSession().getTtlSeconds());
    }

    @Test
    void permissionTimeout_shouldDefaultTo300() {
        AgentModelProperties props = new AgentModelProperties();
        assertEquals(300, props.getPermission().getTimeoutSeconds());
    }

    @Test
    void permissionTimeout_shouldBeConfigurable() {
        AgentModelProperties.PermissionConfig perm = new AgentModelProperties.PermissionConfig();
        perm.setTimeoutSeconds(120);
        assertEquals(120, perm.getTimeoutSeconds());
    }

    @Test
    void agentConfig_shouldSetAndGetAllFields() {
        AgentModelProperties.AgentConfig cfg = new AgentModelProperties.AgentConfig();
        cfg.setName("TestAgent");
        cfg.setProvider("OPENAI");
        cfg.setModel("gpt-4");
        cfg.setApiKey("sk-test");
        cfg.setBaseUrl("https://api.openai.com/v1");
        cfg.setMaxTokens(2048);
        cfg.setTemperature(0.7);
        cfg.setMaxSelfCorrectionAttempts(5);

        assertEquals("TestAgent", cfg.getName());
        assertEquals("OPENAI", cfg.getProvider());
        assertEquals("gpt-4", cfg.getModel());
        assertEquals("sk-test", cfg.getApiKey());
        assertEquals("https://api.openai.com/v1", cfg.getBaseUrl());
        assertEquals(2048, cfg.getMaxTokens());
        assertEquals(0.7, cfg.getTemperature(), 0.001);
        assertEquals(5, cfg.getMaxSelfCorrectionAttempts());
    }

    @Test
    void innerConfigs_shouldBeIndependent() {
        AgentModelProperties props = new AgentModelProperties();

        assertNotNull(props.getChat());
        assertNotNull(props.getArchitect());
        assertNotNull(props.getCoding());
        assertNotNull(props.getSummarizer());
        assertNotNull(props.getSupervisor());

        assertNotSame(props.getChat(), props.getArchitect());
        assertNotSame(props.getCoding(), props.getSummarizer());
    }
}
