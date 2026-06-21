package com.codeevo.project.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Bulk upsert request — allows the agent to push many files at once
 * in a single HTTP call, reducing round-trips.
 */
@Data
public class BulkUpsertCodeFilesRequest {

    @NotEmpty(message = "Files list cannot be empty")
    @Size(max = 500, message = "Cannot upsert more than 500 files at once")
    @Valid
    private List<UpsertCodeFileRequest> files;
}
