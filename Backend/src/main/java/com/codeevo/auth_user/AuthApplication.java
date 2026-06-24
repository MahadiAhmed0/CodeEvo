package com.codeevo.auth_user;

import org.springframework.context.annotation.Configuration;

/**
 * Marker class for the auth_user module.
 * All auth beans are picked up automatically by CodeEvoApplication's component scan.
 * This class is intentionally minimal — the single application entry point is
 * {@link com.codeevo.CodeEvoApplication}.
 */
@Configuration
public class AuthApplication {
    // Intentionally empty — module wired via @ComponentScan from CodeEvoApplication
}
