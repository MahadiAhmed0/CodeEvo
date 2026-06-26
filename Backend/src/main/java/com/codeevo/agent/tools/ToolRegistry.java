package com.codeevo.agent.tools;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Central registry of tool JSON Schema definitions per agent type.
 * These are passed directly to the LLM in the "tools" array of each API call.
 *
 * Tool definitions match the OpenAI function-calling schema format,
 * which is also used by Groq, Gemini (OpenAI-compat), and OpenRouter.
 */
@Component
public class ToolRegistry {

    // ─── Chat AI Tools ────────────────────────────────────────────────────────

    public List<Map<String, Object>> getChatTools() {
        return List.of(
            buildTool("search_project_context",
                "Searches the project codebase semantically. " +
                "ALWAYS call this before answering any code-related question. " +
                "Pass a natural language description of what you are looking for.",
                Map.of(
                    "query", strProp("Natural language description of what you are looking for"),
                    "language", strProp("Optional language filter: java, ts, tsx, yml, or all")
                ),
                List.of("query")),

            buildTool("delegate_to_visual_architect",
                "Trigger ONLY when the user explicitly wants to ADD a brand new architectural node (like a new service domain, database, message queue, or external API) to the canvas. " +
                "Do NOT use this if the node already exists on the canvas. If the user wants to generate code for a node that already exists, use delegate_to_coding_agent instead.",
                Map.of(
                    "architecture_request", strProp("Technical description of the new architectural component(s)"),
                    "current_context_summary", strProp("2-3 sentence summary of the relevant existing architecture")
                ),
                List.of("architecture_request", "current_context_summary")),

            buildTool("delegate_to_coding_agent",
                "Trigger ONLY when the user wants to CREATE, MODIFY, or DELETE code, or when the user asks to implement the code for a service that already exists on the architecture graph. " +
                "Do NOT use this tool if the user is just asking a question or asking you to review/explain code. " +
                "If the user asks a question, use search_project_context to find the code and answer it yourself.",
                Map.of(
                    "task_summary", strProp("Highly detailed, unambiguous description of what needs to be coded"),
                    "target_files", arrayProp("Optional: List of relative project paths that will likely be involved"),
                    "acceptance_criteria", arrayProp("Optional: Verifiable conditions that must be true for task completion")
                ),
                List.of("task_summary")),

            buildTool("ask_clarification",
                "Use when the user's request is ambiguous and you cannot confidently determine the required action.",
                Map.of(
                    "question", strProp("A single, clear question to the user"),
                    "options", arrayProp("Optional list of 2-4 suggested answers")
                ),
                List.of("question"))
        );
    }

    // ─── Visual Architect Tools ───────────────────────────────────────────────

    public List<Map<String, Object>> getArchitectTools() {
        return List.of(
            buildTool("get_current_canvas_state",
                "Retrieves the current nodes and edges on the canvas. ALWAYS call this first to avoid duplicates.",
                Map.of("project_id", strProp("The current project's ID")),
                List.of("project_id")),

            buildTool("render_reactflow_graph",
                "Sends ReactFlow node/edge JSON to the frontend canvas. This is a PREVIEW ONLY — no code is written.",
                Map.of(
                    "nodes", objectArrayProp("Array of ReactFlow node objects to add"),
                    "edges", objectArrayProp("Array of connection objects between nodes"),
                    "summary", strProp("2-3 sentence human-readable summary of the proposed architecture")
                ),
                List.of("nodes", "edges", "summary")),

            buildTool("request_code_generation_permission",
                "After rendering the graph, ALWAYS call this to pause and present Approve/Reject to the user. " +
                "Do NOT auto-generate code.",
                Map.of(
                    "prompt_message", strProp("Message shown to user explaining what will be generated"),
                    "planned_files_to_create", arrayProp("List of new files that will be created"),
                    "planned_files_to_modify", arrayProp("List of existing files that will be modified")
                ),
                List.of("prompt_message", "planned_files_to_create"))
        );
    }

    // ─── Coding Agent Tools ───────────────────────────────────────────────────

    public List<Map<String, Object>> getCodingTools() {
        return List.of(
            buildTool("list_project_files",
                "Lists ALL existing code files in this project's database. " +
                "ALWAYS call this FIRST before any other tool to understand what files already exist. " +
                "This tells you the exact relative file paths to use with view_file and replace_file_content.",
                Map.of(),
                List.of()),

            buildTool("search_codebase",
                "Searches the project database for files containing a class name, method, annotation, or string. " +
                "Returns matching file paths with content snippets. Use this to locate exact paths before editing.",
                Map.of(
                    "query", strProp("The search string, class name, or pattern"),
                    "search_type", enumProp("Search strategy", "class_name", "method_name", "annotation", "string_literal", "regex"),
                    "directory_scope", strProp("Optional: restrict search to files whose path starts with this prefix")
                ),
                List.of("query", "search_type")),

            buildTool("view_file",
                "Reads the full content of a specific file. MUST call this before replace_file_content.",
                Map.of(
                    "file_path", strProp("Relative project path to the file, e.g. src/main/java/com/example/UserService.java"),
                    "start_line", strProp("Optional: start line to read from"),
                    "end_line", strProp("Optional: end line to read to")
                ),
                List.of("file_path")),

            buildTool("replace_file_content",
                "Replaces an EXACT block of code in a file. target_content must match EXACTLY including whitespace. " +
                "NEVER use this to rewrite an entire file.",
                Map.of(
                    "file_path", strProp("Relative project path to the file, e.g. src/main/java/com/example/UserService.java"),
                    "target_content", strProp("EXACT existing code block to find and replace"),
                    "replacement_content", strProp("New code block to insert"),
                    "change_description", strProp("One-sentence summary of the change")
                ),
                List.of("file_path", "target_content", "replacement_content", "change_description")),

            buildTool("create_file",
                "Creates a new code file OR completely overwrites an existing file in the project database. " +
                "Use this instead of replace_file_content when a file is corrupted or needs a total rewrite. " +
                "Use relative project paths (e.g. 'src/main/java/com/example/UserService.java').",
                Map.of(
                    "file_path", strProp("Relative project path for the new file (e.g. src/main/java/com/example/UserService.java)"),
                    "content", strProp("Complete source code content of the file"),
                    "change_description", strProp("One-sentence summary of why this file is being created"),
                    "language", strProp("Optional: file language hint (java, typescript, yaml, xml, json, etc.)")
                ),
                List.of("file_path", "content", "change_description")),

            buildTool("delete_file",
                "Deletes a file. REQUIRES explicit user approval — always call ask_user first.",
                Map.of(
                    "file_path", strProp("Relative project path to the file"),
                    "reason", strProp("Why this file is being deleted")
                ),
                List.of("file_path", "reason")),

            buildTool("run_maven_command",
                "Executes a Maven command against the CodeEvo backend runtime, not the generated project sandbox. Prefer Docker sandbox verification for generated project code.",
                Map.of(
                    "command", enumProp("Maven command", "mvn compile", "mvn test", "mvn clean compile", "mvn spring-boot:run"),
                    "timeout_seconds", strProp("Max execution time in seconds, e.g. '120'")
                ),
                List.of("command")),

            buildTool("emit_progress",
                "Sends a progress update to the frontend. Call at every major step.",
                Map.of(
                    "message", strProp("Short, user-friendly status message"),
                    "status", enumProp("Status level", "RUNNING", "SUCCESS", "WARNING", "FAILED")
                ),
                List.of("message", "status")),

            buildTool("ask_user",
                "Pauses execution and asks the user a question. ONLY use when self-correction has failed 3 times " +
                "or when a design decision requires human judgment.",
                Map.of(
                    "question", strProp("The question to ask"),
                    "context", strProp("The error or situation that caused you to ask"),
                    "options", arrayProp("Suggested answers the user can select")
                ),
                List.of("question", "context")),

            buildTool("checkpoint",
                "Saves current execution state for crash recovery. Call after each successful file modification.",
                Map.of(
                    "completed_steps", arrayProp("List of completed actions"),
                    "remaining_steps", arrayProp("List of steps still to complete")
                ),
                List.of("completed_steps", "remaining_steps"))
        );
    }

    // ─── Schema Helpers ───────────────────────────────────────────────────────

    private Map<String, Object> buildTool(String name, String description,
                                           Map<String, Object> properties, List<String> required) {
        return Map.of(
            "type", "function",
            "function", Map.of(
                "name", name,
                "description", description,
                "parameters", Map.of(
                    "type", "object",
                    "properties", properties,
                    "required", required
                )
            )
        );
    }

    private Map<String, Object> strProp(String description) {
        return Map.of("type", "string", "description", description);
    }

    private Map<String, Object> arrayProp(String description) {
        return Map.of("type", "array", "description", description,
                "items", Map.of("type", "string"));
    }

    private Map<String, Object> objectArrayProp(String description) {
        return Map.of("type", "array", "description", description,
                "items", Map.of("type", "object", "additionalProperties", true));
    }

    private Map<String, Object> enumProp(String description, String... values) {
        return Map.of("type", "string", "description", description, "enum", List.of(values));
    }
}
