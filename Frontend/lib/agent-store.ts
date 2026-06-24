/**
 * Zustand store for the agent system state.
 *
 * Tracks:
 * - WebSocket connection status
 * - Live event stream from all agents
 * - Pending approval requests (diffs + permissions)
 * - Current agent type (who is "speaking")
 * - Session / project context
 */

import { create } from 'zustand'
import {
  AgentEvent,
  AgentType,
  DiffReadyPayload,
  PermissionRequestPayload,
  GraphUpdatePayload,
  stompClient,
  UserFeedback,
} from './websocket'

export interface AgentStoreEvent extends AgentEvent {
  /** Client-assigned display ordering */
  receivedAt: number
}

export interface PendingApproval {
  type: 'DIFF' | 'PERMISSION'
  token: string
  payload: DiffReadyPayload | PermissionRequestPayload
  agentType: AgentType
  receivedAt: number
}

interface AgentStore {
  // Connection
  isConnected: boolean
  sessionId: string | null
  projectId: string | null

  // Event stream
  events: AgentStoreEvent[]

  // Current active agent (null = idle)
  activeAgent: AgentType | null | undefined

  // Whether any agent is currently working
  isAgentRunning: boolean

  // Pending human-in-the-loop approvals
  pendingApprovals: PendingApproval[]

  // Latest graph update payload (for canvas sync)
  latestGraphUpdate: GraphUpdatePayload | null

  // Last message the user sent (used to auto-trigger RAG context search)
  lastUserQuery: string | null

  // Actions
  connect: (sessionId: string, projectId: string, token?: string) => void
  disconnect: () => void
  sendMessage: (message: string) => void
  sendFeedback: (feedback: UserFeedback) => void
  processEvent: (event: AgentEvent) => void
  clearEvents: () => void
  dismissApproval: (token: string) => void
  stopAgent: () => void
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  isConnected: false,
  sessionId: null,
  projectId: null,
  events: [],
  activeAgent: null,
  isAgentRunning: false,
  pendingApprovals: [],
  latestGraphUpdate: null,
  lastUserQuery: null,

  connect: async (sessionId, projectId, token) => {
    set({ sessionId, projectId })

    await stompClient.connect(token)
    set({ isConnected: true })

    // Subscribe to session-scoped topics (no Principal required — works for anonymous)
    stompClient.subscribe(`/topic/session/${sessionId}/events`, (event) => {
      get().processEvent(event)
    })

    stompClient.subscribe(`/topic/session/${sessionId}/diffs`, (event) => {
      get().processEvent(event)
    })

    stompClient.subscribe(`/topic/session/${sessionId}/graph`, (event) => {
      get().processEvent(event)
    })
  },

  disconnect: () => {
    stompClient.disconnect()
    set({ isConnected: false, activeAgent: null, isAgentRunning: false })
  },

  sendMessage: (message) => {
    const { sessionId, projectId } = get()
    if (!sessionId || !projectId) return

    stompClient.send('/app/user-input', { sessionId, projectId, message })
    set({ isAgentRunning: true, activeAgent: 'CHAT', lastUserQuery: message })
  },

  stopAgent: () => {
    set({ isAgentRunning: false, activeAgent: null })
  },

  sendFeedback: (feedback) => {
    stompClient.send('/app/agent-feedback', feedback)
    // Remove from pending approvals
    set((state) => ({
      pendingApprovals: state.pendingApprovals.filter((a) => a.token !== feedback.approvalToken),
    }))
  },

  processEvent: (event) => {
    const storeEvent: AgentStoreEvent = { ...event, receivedAt: Date.now() }

    set((state) => {
      const events = [...state.events, storeEvent]
      let activeAgent: AgentType | null = event.agentType
      let isAgentRunning = state.isAgentRunning
      let pendingApprovals = [...state.pendingApprovals]
      let latestGraphUpdate = state.latestGraphUpdate

      switch (event.type) {
        case 'TASK_COMPLETE':
        case 'FATAL_ERROR':
          isAgentRunning = false
          activeAgent = null
          break

        case 'DIFF_READY': {
          const diff = event.payload as DiffReadyPayload
          pendingApprovals = [
            ...pendingApprovals,
            {
              type: 'DIFF',
              token: diff.approvalToken,
              payload: diff,
              agentType: event.agentType,
              receivedAt: Date.now(),
            },
          ]
          break
        }

        case 'PERMISSION_REQ': {
          const perm = event.payload as PermissionRequestPayload
          pendingApprovals = [
            ...pendingApprovals,
            {
              type: 'PERMISSION',
              token: perm.approvalToken,
              payload: perm,
              agentType: event.agentType,
              receivedAt: Date.now(),
            },
          ]
          break
        }

        case 'GRAPH_UPDATE':
          latestGraphUpdate = event.payload as GraphUpdatePayload
          break
      }

      return { events, activeAgent, isAgentRunning, pendingApprovals, latestGraphUpdate }
    })
  },

  clearEvents: () => set({ events: [] }),

  dismissApproval: (token) =>
    set((state) => ({
      pendingApprovals: state.pendingApprovals.filter((a) => a.token !== token),
    })),
}))
