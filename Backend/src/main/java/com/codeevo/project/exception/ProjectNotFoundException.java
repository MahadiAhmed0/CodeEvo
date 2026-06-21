package com.codeevo.project.exception;

public class ProjectNotFoundException extends RuntimeException {
    public ProjectNotFoundException(String projectId) {
        super("Project not found with id: " + projectId);
    }
}
