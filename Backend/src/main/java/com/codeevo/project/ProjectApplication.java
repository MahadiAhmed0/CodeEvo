package com.codeevo.project;

import org.springframework.context.annotation.Configuration;

/**
 * Marker class for the project module.
 * All project beans are picked up automatically by CodeEvoApplication's component scan.
 * This class is intentionally minimal — the single application entry point is
 * {@link com.codeevo.CodeEvoApplication}.
 */
@Configuration
public class ProjectApplication {
    // Intentionally empty — module wired via @ComponentScan from CodeEvoApplication
}
