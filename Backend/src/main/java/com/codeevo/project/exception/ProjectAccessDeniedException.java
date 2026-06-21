package com.codeevo.project.exception;

public class ProjectAccessDeniedException extends RuntimeException {
    public ProjectAccessDeniedException() {
        super("You do not have access to this project.");
    }
}
