package com.codeevo.github;

import org.springframework.context.annotation.Configuration;

/**
 * Marker class for the github module.
 * All github beans are picked up automatically by CodeEvoApplication's component scan.
 * This class is intentionally minimal — the single application entry point is
 * {@link com.codeevo.CodeEvoApplication}.
 */
@Configuration
public class GitHubApplication {
    // Intentionally empty — module wired via @ComponentScan from CodeEvoApplication
}
