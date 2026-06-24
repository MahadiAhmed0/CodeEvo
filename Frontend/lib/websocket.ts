/**
 * WebSocket STOMP client singleton.
 *
 * Connects to the Spring Boot /ws endpoint with SockJS fallback.
 * All agent events arrive on /user/{userId}/queue/agent-events.
 *
 * Usage:
 *   import { stompClient } from '@/lib/websocket'
 *   stompClient.connect(userId)
 *   stompClient.subscribe('/user/queue/agent-events', (event) => { ... })
 *   stompClient.send('/app/user-input', { sessionId, projectId, message })
 */

import { Client, StompSubscription, IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080/ws'

class StompClientWrapper {
  private client: Client | null = null
  private subscriptions: Map<string, StompSubscription> = new Map()
  private connectPromise: Promise<void> | null = null
  private resolveConnect: (() => void) | null = null

  connect(token?: string): Promise<void> {
    if (this.connectPromise) return this.connectPromise

    this.connectPromise = new Promise((resolve) => {
      this.resolveConnect = resolve
    })

    // SockJS uses a plain HTTP GET for the handshake and cannot carry custom headers.
    // Passing the JWT as a ?token=... query param is the standard SockJS auth pattern.
    const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl) as WebSocket,
      connectHeaders: {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('[STOMP] Connected to CodeEvo agent gateway')
        this.resolveConnect?.()
      },

      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message'])
      },

      onDisconnect: () => {
        console.log('[STOMP] Disconnected')
        this.connectPromise = null
      },
    })

    this.client.activate()
    return this.connectPromise
  }

  disconnect() {
    this.subscriptions.forEach((sub) => sub.unsubscribe())
    this.subscriptions.clear()
    this.client?.deactivate()
    this.client = null
    this.connectPromise = null
  }

  subscribe(destination: string, callback: (event: AgentEvent) => void): string {
    if (!this.client?.connected) {
      console.warn('[STOMP] subscribe called before connection — queuing')
    }
    const subId = `sub-${Date.now()}-${Math.random()}`
    const sub = this.client!.subscribe(destination, (message: IMessage) => {
      try {
        const event: AgentEvent = JSON.parse(message.body)
        callback(event)
      } catch (e) {
        console.error('[STOMP] Failed to parse event:', e)
      }
    })
    this.subscriptions.set(subId, sub)
    return subId
  }

  unsubscribe(subId: string) {
    this.subscriptions.get(subId)?.unsubscribe()
    this.subscriptions.delete(subId)
  }

  send(destination: string, body: object) {
    if (!this.client?.connected) {
      console.warn('[STOMP] Cannot send — not connected')
      return
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    })
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false
  }
}

export const stompClient = new StompClientWrapper()

// ─── Shared TypeScript types for agent events ─────────────────────────────────

export type AgentEventType =
  | 'THOUGHT'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'PROGRESS'
  | 'DIFF_READY'
  | 'GRAPH_UPDATE'
  | 'PERMISSION_REQ'
  | 'MESSAGE'
  | 'ERROR'
  | 'FATAL_ERROR'
  | 'TASK_COMPLETE'

export type AgentType = 'SUPERVISOR' | 'CHAT' | 'VISUAL_ARCHITECT' | 'CODING'

export interface AgentEvent {
  eventId: string
  sessionId: string
  projectId: string
  agentType: AgentType
  type: AgentEventType
  timestamp: string
  payload: AgentPayload
}

export type AgentPayload =
  | ThoughtPayload
  | ProgressPayload
  | ToolCallPayload
  | DiffReadyPayload
  | GraphUpdatePayload
  | PermissionRequestPayload
  | MessagePayload
  | ErrorPayload
  | SimplePayload

export interface SimplePayload { content: string }
export interface ThoughtPayload { content: string }
export interface MessagePayload { content: string }
export interface ErrorPayload { message: string }

export interface ProgressPayload {
  message: string
  /** RUNNING | SUCCESS | WARNING | FAILED */
  status: string
}

export interface ToolCallPayload {
  toolName: string
  args?: Record<string, unknown>
  status: string
  resultSummary?: string
}

export interface DiffReadyPayload {
  filePath: string
  originalContent: string
  modifiedContent: string
  changeDescription: string
  requiresApproval: boolean
  approvalToken: string
}

export interface GraphUpdatePayload {
  nodes: ReactFlowNodeDef[]
  edges: ReactFlowEdgeDef[]
  summary: string
  permissionMessage: string
  approvalToken: string
}

export interface PermissionRequestPayload {
  actionDescription: string
  consequences: string
  approvalToken: string
  plannedFilesToCreate: string[]
  plannedFilesToModify: string[]
}

export interface ReactFlowNodeDef {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    technology?: string
    proposed_class_name?: string
    proposed_package?: string
  }
}

export interface ReactFlowEdgeDef {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
}

export interface UserInputMessage {
  sessionId: string
  projectId: string
  message: string
}

export interface UserFeedback {
  sessionId: string
  projectId?: string
  approvalToken: string
  decision: 'APPROVE' | 'REJECT' | 'MODIFY'
  modificationNote?: string
}
