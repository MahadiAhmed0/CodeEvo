package com.codeevo.agent.model;

/**
 * Discriminates the payload type in every {@link AgentEvent}.
 * The frontend uses this to render the correct UI component.
 */
public enum AgentEventType {
    /** Agent's internal reasoning step (collapsible "thought bubble" in UI) */
    THOUGHT,
    /** Agent is about to call a tool */
    TOOL_CALL,
    /** Tool returned a result */
    TOOL_RESULT,
    /** Human-readable status update (e.g. "Reading AuthService.java...") */
    PROGRESS,
    /** File modification complete — diff payload attached, approval required */
    DIFF_READY,
    /** ReactFlow node/edge JSON for canvas update */
    GRAPH_UPDATE,
    /** Agent is pausing to ask user to approve/reject an action */
    PERMISSION_REQ,
    /** Final agent response text message */
    MESSAGE,
    /** Non-fatal error with recovery suggestion */
    ERROR,
    /** Fatal error — task halted, user must restart */
    FATAL_ERROR,
    /** Execution loop finished successfully */
    TASK_COMPLETE
}
