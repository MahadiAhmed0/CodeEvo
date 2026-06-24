'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Bot, User, Sparkles, ChevronRight,
  Loader2, Copy, Check, Zap, X, ChevronDown, Code2,
  Terminal, GitBranch, AlertTriangle, CheckCircle2, Clock,
  Shield, WifiOff, Wifi, Square
} from 'lucide-react'
import { useAgentStore, AgentStoreEvent } from '@/lib/agent-store'
import { useAuthStore } from '@/lib/auth-store'
import {
  AgentType, ProgressPayload, ToolCallPayload, MessagePayload,
  PermissionRequestPayload, DiffReadyPayload, SimplePayload,
} from '@/lib/websocket'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  agentType?: AgentType
  content: string
  timestamp: Date
  eventType?: string
  status?: string
  isThought?: boolean
  isToolCall?: boolean
  approvalToken?: string
  approvalPayload?: PermissionRequestPayload | DiffReadyPayload
}

// ─── Agent colour mapping ─────────────────────────────────────────────────────

const agentColors: Record<AgentType, string> = {
  SUPERVISOR: 'from-slate-600 to-slate-500',
  CHAT: 'from-[#6c3bf5] to-[#c74cf0]',
  VISUAL_ARCHITECT: 'from-cyan-600 to-blue-500',
  CODING: 'from-emerald-600 to-teal-500',
}

const agentLabels: Record<AgentType, string> = {
  SUPERVISOR: 'Supervisor',
  CHAT: 'Chat AI',
  VISUAL_ARCHITECT: 'Visual Architect',
  CODING: 'Coding Agent',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThoughtBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <Sparkles size={12} className="text-purple-400/60 flex-shrink-0" />
        <span className="text-[11px] text-white/30 font-medium">Agent reasoning</span>
        <ChevronDown
          size={11}
          className={`ml-auto text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-[11px] text-white/30 font-mono leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatToolName(name: string): string {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function ToolCallBadge({ payload }: { payload: ToolCallPayload }) {
  const statusColor = payload.status === 'SUCCESS'
    ? 'text-emerald-400' : payload.status === 'FAILED'
    ? 'text-red-400' : 'text-amber-400'

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <Terminal size={11} className="text-white/30 flex-shrink-0" />
      <span className="text-[11px] text-white/70 font-medium tracking-wide">{formatToolName(payload.toolName)}</span>
      <span className={`ml-auto text-[10px] font-medium ${statusColor}`}>{payload.status}</span>
    </div>
  )
}

function ProgressBadge({ payload }: { payload: ProgressPayload }) {
  const icon = payload.status === 'SUCCESS' ? <CheckCircle2 size={12} className="text-emerald-400" />
    : payload.status === 'FAILED' ? <AlertTriangle size={12} className="text-red-400" />
    : payload.status === 'WARNING' ? <AlertTriangle size={12} className="text-amber-400" />
    : <Loader2 size={12} className="animate-spin text-purple-400" />

  return (
    <div className="flex items-center gap-2 text-[12px] text-white/50 py-0.5">
      {icon}
      <span>{payload.message}</span>
    </div>
  )
}

function ApprovalCard({
  payload, agentType, token, onApprove, onReject,
}: {
  payload: PermissionRequestPayload
  agentType: AgentType
  token: string
  onApprove: (token: string) => void
  onReject: (token: string) => void
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-amber-400" />
        <span className="text-[12px] font-semibold text-amber-300">Approval Required</span>
      </div>
      <p className="text-[12px] text-white/70 leading-relaxed">{payload.actionDescription}</p>
      {payload.consequences && (
        <p className="text-[11px] text-white/40">{payload.consequences}</p>
      )}
      {payload.plannedFilesToCreate?.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">Files to create</p>
          {payload.plannedFilesToCreate.map(f => (
            <div key={f} className="flex items-center gap-1.5 py-0.5">
              <Code2 size={10} className="text-emerald-400/60" />
              <code className="text-[10px] text-white/40 font-mono">{f}</code>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onApprove(token)}
          className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20
                     text-[12px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => onReject(token)}
          className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20
                     text-[12px] font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentChat({
  isOpen, setIsOpen,
  sessionId, projectId,
}: {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  sessionId?: string
  projectId?: string
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'agent',
    agentType: 'CHAT',
    content: "Hello! I'm CodeEvo Chat AI, your senior software architect. I can answer questions about your codebase, design new architectural components, and generate code. What would you like to build?",
    timestamp: new Date(),
    eventType: 'MESSAGE',
  }])
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    isConnected, isAgentRunning, activeAgent, events,
    connect, sendMessage, sendFeedback, stopAgent, pendingApprovals,
  } = useAgentStore()

  useEffect(() => { setIsMounted(true) }, [])

  // Connect to WebSocket when the panel opens
  useEffect(() => {
    const effectiveSession = sessionId ?? projectId ?? ''
    if (isOpen && effectiveSession && !isConnected) {
      const token = useAuthStore.getState().accessToken ?? undefined
      connect(effectiveSession, projectId ?? effectiveSession, token)
    }
  }, [isOpen, sessionId, projectId, isConnected, connect])

  // Convert incoming agent events → chat messages.
  // Tracks last-processed index via a ref so ALL events are processed even when
  // the backend fires PROGRESS → TOOL_CALL → MESSAGE → TASK_COMPLETE in one burst.
  const processedIndexRef = useRef<number>(0)

  useEffect(() => {
    if (!events.length) return

    // Process ALL events we haven't seen yet
    const newEvents = events.slice(processedIndexRef.current)
    processedIndexRef.current = events.length

    const newMessages: ChatMessage[] = []

    for (const latest of newEvents) {
      const p = latest.payload as any

      const newMsg: ChatMessage | null = (() => {
        switch (latest.type) {
          case 'MESSAGE':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: (p as MessagePayload).content ?? '',
              timestamp: new Date(latest.timestamp),
              eventType: 'MESSAGE',
            }
          case 'THOUGHT':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: (p as SimplePayload).content ?? '',
              timestamp: new Date(latest.timestamp),
              isThought: true,
            }
          case 'PROGRESS':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: (p as ProgressPayload).message,
              timestamp: new Date(latest.timestamp),
              eventType: 'PROGRESS',
              status: (p as ProgressPayload).status,
            }
          case 'TOOL_CALL':
          case 'TOOL_RESULT':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: '',
              timestamp: new Date(latest.timestamp),
              isToolCall: true,
              eventType: latest.type,
              status: (p as ToolCallPayload).status,
            }
          case 'PERMISSION_REQ':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: (p as PermissionRequestPayload).actionDescription,
              timestamp: new Date(latest.timestamp),
              eventType: 'PERMISSION_REQ',
              approvalToken: (p as PermissionRequestPayload).approvalToken,
              approvalPayload: p as PermissionRequestPayload,
            }
          case 'ERROR':
          case 'FATAL_ERROR':
            return {
              id: latest.eventId,
              role: 'agent' as const,
              agentType: latest.agentType,
              content: `⚠️ ${p.message ?? 'An error occurred.'}`,
              timestamp: new Date(latest.timestamp),
              eventType: latest.type,
            }
          default:
            return null
        }
      })()

      if (newMsg) newMessages.push(newMsg)
    }

    if (newMessages.length > 0) {
      setChatMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const unique = newMessages.filter(m => !existingIds.has(m.id))
        return unique.length > 0 ? [...prev, ...unique] : prev
      })
    }
  }, [events])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isAgentRunning])

  const handleSend = useCallback(() => {
    if (!input.trim() || isAgentRunning) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, userMsg])
    sendMessage(input.trim())
    setInput('')
  }, [input, isAgentRunning, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleApprove = (token: string) => {
    sendFeedback({
      sessionId: sessionId ?? '',
      projectId,
      approvalToken: token,
      decision: 'APPROVE',
    })
  }

  const handleReject = (token: string) => {
    sendFeedback({
      sessionId: sessionId ?? '',
      projectId,
      approvalToken: token,
      decision: 'REJECT',
    })
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl
                   bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white text-sm font-semibold
                   shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
      >
        <MessageSquare size={16} />
        Agent
        {isAgentRunning && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </motion.button>
    )
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full flex flex-col border-l border-white/[0.06] bg-[#0d1220]/95 backdrop-blur-xl overflow-hidden"
      style={{ width: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0]
                          flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {activeAgent ? agentLabels[activeAgent] : 'Agent System'}
            </h3>
            <div className="flex items-center gap-1.5">
              {isConnected
                ? <Wifi size={10} className="text-emerald-400" />
                : <WifiOff size={10} className="text-white/30" />}
              <span className="text-[11px] text-white/40 font-medium">
                {isConnected ? (isAgentRunning ? 'Working...' : 'Ready') : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {chatMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            {msg.role === 'agent' && (
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                              bg-gradient-to-br ${agentColors[msg.agentType ?? 'CHAT']}
                              shadow-md shadow-purple-500/10`}>
                {msg.agentType === 'CODING' ? <Code2 size={12} className="text-white" />
                  : msg.agentType === 'VISUAL_ARCHITECT' ? <GitBranch size={12} className="text-white" />
                  : <Bot size={12} className="text-white" />}
              </div>
            )}

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                              bg-gradient-to-br from-[#6c3bf5]/60 to-[#c74cf0]/60">
                <User size={12} className="text-white" />
              </div>
            )}

            {/* Content */}
            <div className={`group relative max-w-[88%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : ''}`}>
              {/* Agent name badge */}
              {msg.role === 'agent' && msg.agentType && !msg.isThought && !msg.isToolCall && (
                <p className="text-[10px] text-white/25 px-1">
                  {agentLabels[msg.agentType]}
                </p>
              )}

              {/* Thought block */}
              {msg.isThought && <ThoughtBlock content={msg.content} />}

              {/* Tool call badge */}
              {msg.isToolCall && msg.eventType && (
                <ToolCallBadge payload={{
                  toolName: msg.content || 'tool',
                  status: msg.status ?? 'RUNNING',
                }} />
              )}

              {/* Progress message */}
              {msg.eventType === 'PROGRESS' && (
                <ProgressBadge payload={{ message: msg.content, status: msg.status ?? 'RUNNING' }} />
              )}

              {/* Approval card */}
              {msg.eventType === 'PERMISSION_REQ' && msg.approvalToken && msg.approvalPayload && (
                <ApprovalCard
                  payload={msg.approvalPayload as PermissionRequestPayload}
                  agentType={msg.agentType ?? 'SUPERVISOR'}
                  token={msg.approvalToken}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )}

              {/* Standard message */}
              {!msg.isThought && !msg.isToolCall &&
               msg.eventType !== 'PROGRESS' && msg.eventType !== 'PERMISSION_REQ' && (
                <div className={`px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white rounded-tr-sm'
                    : msg.eventType === 'ERROR' || msg.eventType === 'FATAL_ERROR'
                    ? 'bg-red-500/[0.08] border border-red-500/[0.15] text-red-300/90 rounded-tl-sm'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/80 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}

              {/* Timestamp + copy */}
              {!msg.isThought && !msg.isToolCall && msg.eventType !== 'PROGRESS' && (
                <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-[10px] text-white/20">
                    {isMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {msg.role === 'agent' && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.06] rounded"
                    >
                      {copiedId === msg.id
                        ? <Check size={10} className="text-emerald-400" />
                        : <Copy size={10} className="text-white/30" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Typing / working indicator */}
        <AnimatePresence>
          {isAgentRunning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex gap-3"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                              bg-gradient-to-br ${agentColors[activeAgent ?? 'CHAT']}
                              shadow-md shadow-purple-500/10`}>
                <Bot size={12} className="text-white" />
              </div>
              <div className="px-4 py-3 rounded-xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400/60"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/30 ml-1">
                    {activeAgent ? agentLabels[activeAgent] + ' is working...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="relative flex items-end gap-2 bg-white/[0.04] border border-white/[0.08]
                        rounded-xl px-4 py-3 focus-within:border-purple-500/30 focus-within:bg-white/[0.06]
                        transition-all duration-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAgentRunning ? 'Agent is working...' : 'Ask the agent anything...'}
            disabled={isAgentRunning}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20
                       resize-none outline-none max-h-24 scrollbar-thin disabled:opacity-40"
            style={{ lineHeight: '1.5' }}
          />
          {isAgentRunning ? (
            <button
              onClick={stopAgent}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30
                         transition-all duration-200 flex-shrink-0 flex items-center justify-center"
              title="Stop Generation"
            >
              <Square fill="currentColor" size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className="p-2 rounded-lg bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white
                         disabled:opacity-30 hover:shadow-lg hover:shadow-purple-500/20
                         transition-all duration-200 flex-shrink-0"
            >
              <Send size={14} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-white/15 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </motion.aside>
  )
}
