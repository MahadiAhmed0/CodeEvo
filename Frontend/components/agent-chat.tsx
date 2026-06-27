'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Bot, User, Sparkles,
  Loader2, Copy, Check, X, ChevronDown, Code2,
  Terminal, GitBranch, AlertTriangle, CheckCircle2,
  Shield, WifiOff, Wifi, Square, FileCode, Search,
  List, Eye, RefreshCw, Play, Save, HelpCircle,
  Zap, ChevronRight, FileText, Database,
} from 'lucide-react'
import { useAgentStore } from '@/lib/agent-store'
import { useAuthStore } from '@/lib/auth-store'
import {
  AgentType, ProgressPayload, ToolCallPayload, MessagePayload,
  PermissionRequestPayload, DiffReadyPayload, SimplePayload,
} from '@/lib/websocket'

// --- Types ---

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
  toolName?: string
  resultSummary?: string
  approvalToken?: string
  approvalPayload?: PermissionRequestPayload | DiffReadyPayload
}

function normalizeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>()
  return messages.map((message, index) => ({
    ...message,
    id: message.id || `message-${index}`,
  })).filter((message) => {
    const id = message.id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function chatRenderKey(message: ChatMessage, index: number) {
  return `${message.id}-${message.eventType ?? message.role}-${index}`
}

// --- Metadata maps ---

const agentColors: Record<AgentType, { from: string; to: string; glow: string; text: string }> = {
  SUPERVISOR: { from: '#475569', to: '#64748b', glow: 'rgba(71,85,105,0.3)', text: 'text-slate-300' },
  CHAT:       { from: '#6c3bf5', to: '#c74cf0', glow: 'rgba(108,59,245,0.3)', text: 'text-purple-200' },
  VISUAL_ARCHITECT: { from: '#0891b2', to: '#2563eb', glow: 'rgba(8,145,178,0.3)', text: 'text-cyan-200' },
  CODING:     { from: '#059669', to: '#0d9488', glow: 'rgba(5,150,105,0.3)', text: 'text-emerald-200' },
}

const agentLabels: Record<AgentType, string> = {
  SUPERVISOR: 'Supervisor',
  CHAT: 'Chat AI',
  VISUAL_ARCHITECT: 'Visual Architect',
  CODING: 'Coding Agent',
}

const TOOL_META: Record<string, { label: string; color: string; description: string }> = {
  list_project_files:     { label: 'Listing Project Files',    color: 'text-sky-400',     description: 'Scanning all project files in the database' },
  search_codebase:        { label: 'Searching Codebase',       color: 'text-violet-400',  description: 'Looking for relevant files and code patterns' },
  view_file:              { label: 'Reading File',             color: 'text-amber-400',   description: 'Reading file content before making changes' },
  create_file:            { label: 'Creating File',            color: 'text-emerald-400', description: 'Writing a new file to the project database' },
  replace_file_content:   { label: 'Editing File',             color: 'text-orange-400',  description: 'Making targeted edits to an existing file' },
  delete_file:            { label: 'Deleting File',            color: 'text-red-400',     description: 'Removing a file from the project' },
  run_maven_command:      { label: 'Running Maven',            color: 'text-green-400',   description: 'Executing Maven build command' },
  run_tests:              { label: 'Running Tests',            color: 'text-green-400',   description: 'Executing test suite' },
  emit_progress:          { label: 'Reporting Progress',       color: 'text-purple-400',  description: 'Sending status update' },
  checkpoint:             { label: 'Saving Checkpoint',        color: 'text-blue-400',    description: 'Saving task progress snapshot' },
  ask_user:               { label: 'Asking for Clarification', color: 'text-amber-400',   description: 'Agent needs your input to continue' },
  search_project_context: { label: 'Searching Context',        color: 'text-indigo-400',  description: 'Querying project knowledge base' },
  delegate_to_coding_agent: { label: 'Delegating to Coding AI', color: 'text-emerald-400', description: 'Handing task to the Coding Agent' },
  delegate_to_visual_architect: { label: 'Delegating to Architect', color: 'text-cyan-400', description: 'Handing task to the Visual Architect' },
  ask_clarification:      { label: 'Asking Clarification',    color: 'text-amber-400',   description: 'Requesting more details from you' },
  update_architecture_graph: { label: 'Updating Architecture', color: 'text-cyan-400',    description: 'Updating the architecture canvas' },
}

function getToolMeta(toolName: string) {
  return TOOL_META[toolName] ?? {
    label: toolName.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    color: 'text-white/50',
    description: 'Executing tool',
  }
}

// --- Sub-components ---

function ThoughtBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-purple-500/15 bg-purple-500/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-purple-500/[0.04] transition-colors"
      >
        <Sparkles size={11} className="text-purple-400/70 flex-shrink-0" />
        <span className="text-[11px] text-purple-300/60 font-semibold tracking-wide">Agent reasoning</span>
        <span className="ml-auto text-[10px] text-purple-300/30 font-mono">{content.split(' ').length} words</span>
        <ChevronDown size={11} className={`text-purple-300/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mx-3.5 mb-3 border-t border-purple-500/10" />
            <p className="px-3.5 pb-3 text-[11px] text-purple-200/30 font-mono leading-relaxed whitespace-pre-wrap">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolCallRow({ toolName, status, resultSummary }: { toolName: string; status: string; resultSummary?: string }) {
  const [open, setOpen] = useState(false)
  const meta = getToolMeta(toolName)
  const isRunning = status === 'RUNNING'
  const isSuccess = status === 'SUCCESS'
  const isFailed = status === 'FAILED'

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${isFailed ? 'border-red-500/20 bg-red-500/[0.03]' : isSuccess ? 'border-white/[0.07] bg-white/[0.02]' : 'border-purple-500/20 bg-purple-500/[0.03]'}`}>
      <button
        onClick={() => resultSummary && setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${resultSummary ? 'hover:bg-white/[0.02] cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex-shrink-0">
          {isRunning && <Loader2 size={12} className="animate-spin text-purple-400" />}
          {isSuccess && <CheckCircle2 size={12} className="text-emerald-400" />}
          {isFailed && <AlertTriangle size={12} className="text-red-400" />}
        </div>
        <Terminal size={12} className={`flex-shrink-0 ${meta.color}`} />
        <span className="text-[12px] font-semibold text-white/70 flex-1">{meta.label}</span>
        <span className={`text-[10px] font-bold tracking-wider ${isFailed ? 'text-red-400' : isSuccess ? 'text-emerald-400/70' : 'text-purple-400'}`}>{status}</span>
        {resultSummary && <ChevronRight size={11} className={`text-white/20 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />}
      </button>
      <p className="px-3 pb-1.5 text-[10px] text-white/25 font-mono -mt-0.5">{meta.description}</p>
      <AnimatePresence>
        {open && resultSummary && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="mx-3 mb-2 border-t border-white/[0.05]" />
            <p className="px-3 pb-2.5 text-[10.5px] text-white/35 font-mono leading-relaxed whitespace-pre-wrap line-clamp-6">{resultSummary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProgressBadge({ message, status }: { message: string; status: string }) {
  const isSuccess = status === 'SUCCESS'
  const isFailed = status === 'FAILED'
  return (
    <div className={`flex items-start gap-2.5 py-1.5 px-3 rounded-lg ${isSuccess ? 'bg-emerald-500/[0.05]' : isFailed ? 'bg-red-500/[0.05]' : ''}`}>
      {isSuccess && <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />}
      {isFailed && <AlertTriangle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />}
      {!isSuccess && !isFailed && <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 mt-1.5 flex-shrink-0 animate-pulse" />}
      <span className={`text-[12px] leading-relaxed font-medium ${isSuccess ? 'text-emerald-300/80' : isFailed ? 'text-red-300/80' : 'text-white/50'}`}>{message}</span>
    </div>
  )
}

function ApprovalCard({ payload, agentType, token, onApprove, onReject }: {
  payload: PermissionRequestPayload; agentType: AgentType; token: string;
  onApprove: (token: string) => void; onReject: (token: string) => void
}) {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield size={13} className="text-amber-400" />
        <span className="text-[12px] font-bold text-amber-300 tracking-wide">Approval Required</span>
      </div>
      <p className="text-[12px] text-white/70 leading-relaxed">{payload.actionDescription}</p>
      {payload.consequences && <p className="text-[11px] text-white/40 leading-relaxed">{payload.consequences}</p>}
      {payload.plannedFilesToCreate?.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Files to create</p>
          {payload.plannedFilesToCreate.map((f: string) => (
            <div key={f} className="flex items-center gap-1.5 py-0.5">
              <Code2 size={10} className="text-emerald-400/60" />
              <code className="text-[10px] text-white/40 font-mono">{f}</code>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onApprove(token)} className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[12px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors">✓ Approve</button>
        <button onClick={() => onReject(token)} className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] font-bold text-red-300 hover:bg-red-500/20 transition-colors">✗ Reject</button>
      </div>
    </div>
  )
}

function AgentBlock({ agentType, children }: { agentType: AgentType; children: React.ReactNode }) {
  const colors = agentColors[agentType]
  const label = agentLabels[agentType]
  const Icon = agentType === 'CODING' ? Code2 : agentType === 'VISUAL_ARCHITECT' ? GitBranch : Bot
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
          style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 4px 12px ${colors.glow}` }}>
          <Icon size={13} className="text-white" />
        </div>
        <div className="w-px flex-1 min-h-[8px] bg-white/[0.04]" />
      </div>
      <div className="flex-1 pb-1 space-y-1.5 min-w-0">
        <p className={`text-[10.5px] font-bold uppercase tracking-widest mt-1 ${colors.text} opacity-60`}>{label}</p>
        {children}
      </div>
    </div>
  )
}

// --- Main component ---

export function AgentChat({ isOpen, setIsOpen, sessionId, projectId }: {
  isOpen: boolean; setIsOpen: (v: boolean) => void; sessionId?: string; projectId?: string
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const processedIndexRef = useRef<number>(0)
  const { isConnected, isAgentRunning, activeAgent, events, connect, sendMessage, sendFeedback, stopAgent } = useAgentStore()

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (!projectId) return
    const key = `codeevo-chat-${projectId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved, (k, v) => { if (k === 'timestamp' && typeof v === 'string') return new Date(v); return v })
        setChatMessages(Array.isArray(parsed) ? normalizeChatMessages(parsed) : [])
      } catch { setChatMessages([]) }
    } else {
      setChatMessages([{ id: 'welcome', role: 'agent', agentType: 'CHAT', content: "Hello! I'm CodeEvo Chat AI, your senior software architect. I can answer questions about your codebase, design new architectural components, and generate code. What would you like to build?", timestamp: new Date(), eventType: 'MESSAGE' }])
    }
    processedIndexRef.current = 0
  }, [projectId])

  useEffect(() => {
    if (projectId && chatMessages.length > 0) localStorage.setItem(`codeevo-chat-${projectId}`, JSON.stringify(chatMessages))
  }, [chatMessages, projectId])

  useEffect(() => {
    const effectiveSession = sessionId ?? projectId ?? ''
    if (isOpen && effectiveSession) {
      const token = useAuthStore.getState().accessToken ?? undefined
      connect(effectiveSession, projectId ?? effectiveSession, token)
    }
  }, [isOpen, sessionId, projectId, connect])

  useEffect(() => {
    if (!events.length) return
    const newEvents = events.slice(processedIndexRef.current)
    processedIndexRef.current = events.length
    const newMessages: ChatMessage[] = []
    for (const latest of newEvents) {
      const p = latest.payload as any
      const newMsg: ChatMessage | null = (() => {
        switch (latest.type) {
          case 'MESSAGE': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: (p as MessagePayload).content ?? '', timestamp: new Date(latest.timestamp), eventType: 'MESSAGE' }
          case 'THOUGHT': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: (p as SimplePayload).content ?? '', timestamp: new Date(latest.timestamp), isThought: true }
          case 'PROGRESS': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: (p as ProgressPayload).message, timestamp: new Date(latest.timestamp), eventType: 'PROGRESS', status: (p as ProgressPayload).status }
          case 'TOOL_CALL':
          case 'TOOL_RESULT': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: '', toolName: (p as ToolCallPayload).toolName, resultSummary: (p as ToolCallPayload).resultSummary, timestamp: new Date(latest.timestamp), isToolCall: true, eventType: latest.type, status: (p as ToolCallPayload).status }
          case 'PERMISSION_REQ': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: (p as PermissionRequestPayload).actionDescription, timestamp: new Date(latest.timestamp), eventType: 'PERMISSION_REQ', approvalToken: (p as PermissionRequestPayload).approvalToken, approvalPayload: p as PermissionRequestPayload }
          case 'ERROR': case 'FATAL_ERROR': return { id: latest.eventId, role: 'agent' as const, agentType: latest.agentType, content: p.message ?? 'An error occurred.', timestamp: new Date(latest.timestamp), eventType: latest.type }
          default: return null
        }
      })()
      if (newMsg) newMessages.push(newMsg)
    }
    if (newMessages.length > 0) {
      setChatMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const batchIds = new Set<string>()
        const unique = newMessages.filter((m) => {
          if (existingIds.has(m.id) || batchIds.has(m.id)) return false
          batchIds.add(m.id)
          return true
        })
        return unique.length > 0 ? normalizeChatMessages([...prev, ...unique]) : normalizeChatMessages(prev)
      })
    }
  }, [events])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages, isAgentRunning])

  const handleSend = useCallback(() => {
    if (!input.trim() || isAgentRunning) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: new Date() }
    setChatMessages(prev => [...prev, userMsg])
    sendMessage(input.trim())
    setInput('')
  }, [input, isAgentRunning, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const copyMessage = (id: string, content: string) => { navigator.clipboard.writeText(content); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }
  const handleApprove = (token: string) => { sendFeedback({ sessionId: sessionId ?? '', projectId, approvalToken: token, decision: 'APPROVE' }) }
  const handleReject = (token: string) => { sendFeedback({ sessionId: sessionId ?? '', projectId, approvalToken: token, decision: 'REJECT' }) }

  if (!isOpen) {
    return (
      <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300">
        <MessageSquare size={16} />Agent
        {isAgentRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </motion.button>
    )
  }

  // Group consecutive messages from same agent
  const groups: { key: string; agentType?: AgentType; isUser: boolean; messages: ChatMessage[] }[] = []
  for (const msg of chatMessages) {
    const last = groups[groups.length - 1]
    const sameGroup = last && ((msg.role === 'user' && last.isUser) || (msg.role === 'agent' && !last.isUser && msg.agentType === last.agentType))
    if (sameGroup) { last.messages.push(msg) } else { groups.push({ key: msg.id, agentType: msg.agentType, isUser: msg.role === 'user', messages: [msg] }) }
  }

  return (
    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 420, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 200 }}
      className="h-full flex flex-col border-l border-white/[0.06] bg-[#0a0f1d]/98 backdrop-blur-xl overflow-hidden" style={{ width: 420 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-[#0a0f1d] to-[#0d1220]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Bot size={17} className="text-white" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1d] ${isConnected ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{activeAgent ? agentLabels[activeAgent] : 'Agent System'}</h3>
            <div className="flex items-center gap-1.5">
              {isConnected ? <Wifi size={9} className="text-emerald-400" /> : <WifiOff size={9} className="text-white/30" />}
              <span className="text-[10.5px] text-white/40 font-medium">{isConnected ? (isAgentRunning ? 'Working...' : 'Ready') : 'Connecting...'}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"><X size={15} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scrollbar-thin">
        {groups.map(group => {
          if (group.isUser) {
            return (
              <div key={group.key} className="flex justify-end gap-2.5">
                <div className="space-y-1 max-w-[85%]">
                  {group.messages.map((msg, msgIndex) => (
                    <motion.div key={chatRenderKey(msg, msgIndex)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] text-[13px] text-white leading-relaxed shadow-md shadow-purple-500/20">{msg.content}</div>
                      <p className="text-[10px] text-white/20 text-right mt-1 px-1">{isMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 bg-gradient-to-br from-[#6c3bf5]/50 to-[#c74cf0]/50"><User size={12} className="text-white" /></div>
              </div>
            )
          }
          return (
            <motion.div key={group.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <AgentBlock agentType={group.agentType ?? 'CHAT'}>
                <div className="space-y-1.5">
                  {group.messages.map((msg, msgIndex) => (
                    <div key={chatRenderKey(msg, msgIndex)}>
                      {msg.isThought && <ThoughtBlock content={msg.content} />}
                      {msg.isToolCall && msg.toolName && <ToolCallRow toolName={msg.toolName} status={msg.status ?? 'RUNNING'} resultSummary={msg.resultSummary} />}
                      {msg.eventType === 'PROGRESS' && <ProgressBadge message={msg.content} status={msg.status ?? 'RUNNING'} />}
                      {msg.eventType === 'PERMISSION_REQ' && msg.approvalToken && msg.approvalPayload && (
                        <ApprovalCard payload={msg.approvalPayload as PermissionRequestPayload} agentType={msg.agentType ?? 'SUPERVISOR'} token={msg.approvalToken} onApprove={handleApprove} onReject={handleReject} />
                      )}
                      {!msg.isThought && !msg.isToolCall && msg.eventType !== 'PROGRESS' && msg.eventType !== 'PERMISSION_REQ' && (
                        <div className={`group relative px-4 py-3 rounded-xl rounded-tl-sm text-[13px] leading-relaxed ${msg.eventType === 'ERROR' || msg.eventType === 'FATAL_ERROR' ? 'bg-red-500/[0.07] border border-red-500/[0.15] text-red-300/90' : 'bg-white/[0.04] border border-white/[0.07] text-white/80'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/[0.04]">
                            <span className="text-[10px] text-white/20">{isMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            {msg.content && (
                              <button onClick={() => copyMessage(msg.id, msg.content)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.08] rounded ml-auto">
                                {copiedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-white/30" />}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AgentBlock>
            </motion.div>
          )
        })}

        <AnimatePresence>
          {isAgentRunning && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AgentBlock agentType={activeAgent ?? 'CHAT'}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400/60"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                  <span className="text-[11.5px] text-white/35 font-medium">{activeAgent ? agentLabels[activeAgent] + ' is working...' : 'Thinking...'}</span>
                  <button onClick={stopAgent} className="ml-auto p-1 rounded-md bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Stop generation"><Square size={10} fill="currentColor" /></button>
                </div>
              </AgentBlock>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06] bg-gradient-to-t from-[#0a0f1d] to-transparent">
        <div className="relative flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-purple-500/40 focus-within:bg-white/[0.06] focus-within:shadow-lg focus-within:shadow-purple-500/10 transition-all duration-200">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isAgentRunning ? 'Agent is working...' : 'Ask the agent anything...'} disabled={isAgentRunning} rows={1}
            className="flex-1 bg-transparent text-[13px] text-white/90 placeholder:text-white/20 resize-none outline-none max-h-32 scrollbar-thin disabled:opacity-40 leading-relaxed" />
          {isAgentRunning ? (
            <button onClick={stopAgent} className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all duration-200 flex-shrink-0" title="Stop Generation"><Square fill="currentColor" size={13} /></button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim() || !isConnected} className="p-2 rounded-lg bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white disabled:opacity-30 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex-shrink-0"><Send size={13} /></button>
          )}
        </div>
        <p className="text-[10px] text-white/15 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </motion.aside>
  )
}
