package com.codeevo.agent.supervisor;

/**
 * Supervisor state machine states.
 */
public enum SupervisorState {
    /** No active task */
    IDLE,
    /** Chat AI is running, determining what to do */
    ROUTING,
    /** Coding Agent is executing a coding task */
    EXECUTING,
    /** Visual Architect is designing the architecture */
    DESIGNING,
    /** User has been shown a diff/graph and must approve/reject */
    AWAITING_APPROVAL,
    /** Task complete */
    COMPLETE
}
