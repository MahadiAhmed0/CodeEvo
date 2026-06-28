'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  MessageSquare, Send, Bot, User, Sparkles,
  Loader2, Copy, Check, X, ChevronDown, Code2,
  Terminal, GitBranch, AlertTriangle, CheckCircle2,
  Shield, Square,
  ChevronRight,
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
    <div className="rounded-lg border border-purple-500/10 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-purple-500/[0.03] transition-colors"
      >
        <Sparkles size={10} className="text-purple-400/50 flex-shrink-0" />
        <span className="text-[10px] text-purple-300/40 font-medium">Reasoning</span>
        <span className="ml-auto text-[9px] text-purple-300/20 font-mono">{content.split(' ').length} words</span>
        <ChevronDown size={10} className={`text-purple-300/20 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mx-3 border-t border-purple-500/8" />
            <p className="px-3 py-2 text-[10.5px] text-purple-200/25 font-mono leading-relaxed whitespace-pre-wrap">{content}</p>
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
    <div className="rounded-md overflow-hidden transition-colors">
      <button
        onClick={() => resultSummary && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-1 text-left ${resultSummary ? 'hover:bg-white/[0.02] cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex-shrink-0">
          {isRunning && <Loader2 size={10} className="animate-spin text-purple-400/50" />}
          {isSuccess && <CheckCircle2 size={10} className="text-emerald-400/50" />}
          {isFailed && <AlertTriangle size={10} className="text-red-400/50" />}
        </div>
        <span className={`text-[11px] ${isFailed ? 'text-red-300/60' : isSuccess ? 'text-white/40' : 'text-purple-300/50'} flex-1`}>{meta.label}</span>
        <span className={`text-[9px] ${isFailed ? 'text-red-400/60' : isSuccess ? 'text-emerald-400/50' : 'text-purple-400/50'}`}>{status}</span>
        {resultSummary && <ChevronRight size={10} className={`text-white/15 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />}
      </button>
      <p className="px-2.5 pb-1 text-[9px] text-white/15">{meta.description}</p>
      <AnimatePresence>
        {open && resultSummary && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="mx-2.5 border-t border-white/[0.03]" />
            <p className="px-2.5 pb-1.5 text-[10px] text-white/25 font-mono leading-relaxed whitespace-pre-wrap line-clamp-6">{resultSummary}</p>
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
    <div className="flex items-center gap-2 py-0.5">
      {isSuccess && <CheckCircle2 size={11} className="text-emerald-400/70 flex-shrink-0" />}
      {isFailed && <AlertTriangle size={11} className="text-red-400/70 flex-shrink-0" />}
      {!isSuccess && !isFailed && <Loader2 size={11} className="text-purple-400/50 flex-shrink-0 animate-spin" />}
      <span className={`text-[11.5px] leading-relaxed ${isSuccess ? 'text-emerald-300/60' : isFailed ? 'text-red-300/60' : 'text-white/40'}`}>{message}</span>
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

function AgentBlock({ agentType, children, collapsible = true }: { agentType: AgentType; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(false)
  const colors = agentColors[agentType]
  const label = agentLabels[agentType]
  const Icon = agentType === 'CODING' ? Code2 : agentType === 'VISUAL_ARCHITECT' ? GitBranch : Bot

  if (!collapsible) {
    return (
      <div className="flex gap-2.5">
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
            <Icon size={11} className="text-white" />
          </div>
          <div className="w-px flex-1 min-h-[6px] bg-white/[0.03]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${colors.text} opacity-50`}>{label}</p>
          <div className="space-y-0.5">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <button onClick={() => setOpen(o => !o)} className="w-6 h-6 rounded-md flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
          <Icon size={11} className="text-white" />
        </button>
        <button onClick={() => setOpen(o => !o)} className="w-px flex-1 min-h-[6px] bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer" />
      </div>
      <div className="flex-1 min-w-0">
        <button onClick={() => setOpen(o => !o)} className="w-full text-left">
          <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${colors.text} opacity-50`}>
            {label}
            <ChevronDown size={9} className={`inline ml-1 text-white/20 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </p>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-0.5">
              {children}
            </motion.div>
          )}
        </AnimatePresence>
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

  // Group consecutive messages from same agent, collapsing duplicate progress
  const groups: { key: string; agentType?: AgentType; isUser: boolean; messages: ChatMessage[] }[] = []
  for (const msg of chatMessages) {
    const last = groups[groups.length - 1]
    const sameGroup = last && ((msg.role === 'user' && last.isUser) || (msg.role === 'agent' && !last.isUser && msg.agentType === last.agentType))
    if (sameGroup) {
      const lastMsg = last.messages[last.messages.length - 1]
      // Deduplicate consecutive identical progress messages
      if (msg.eventType === 'PROGRESS' && lastMsg.eventType === 'PROGRESS' && msg.content === lastMsg.content) continue
      last.messages.push(msg)
    } else {
      groups.push({ key: msg.id, agentType: msg.agentType, isUser: msg.role === 'user', messages: [msg] })
    }
  }

  return (
    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 420, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 200 }}
      className="h-full flex flex-col border-l border-white/[0.06] bg-[#0a0f1d]/98 backdrop-blur-xl overflow-hidden" style={{ width: 420 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-[#6c3bf5] flex items-center justify-center">
              <Bot size={13} className="text-white" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#0a0f1d] ${isConnected ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white/90">CodeEvo Agent</h3>
            <span className="text-[10px] text-white/30">{isConnected ? (isAgentRunning ? 'Working...' : 'Ready') : 'Connecting...'}</span>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded-md hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-colors"><X size={13} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
        {groups.map(group => {
          if (group.isUser) {
            return (
              <div key={group.key} className="flex justify-end gap-2.5">
                <div className="space-y-1 max-w-[85%]">
                  {group.messages.map((msg, msgIndex) => (
                    <motion.div key={chatRenderKey(msg, msgIndex)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-3.5 py-2 rounded-xl rounded-tr-sm bg-[#6c3bf5]/20 text-[13px] text-white/90 leading-relaxed">{msg.content}</div>
                      <p className="text-[9px] text-white/15 text-right mt-0.5 px-1">{isMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#6c3bf5]/30"><User size={10} className="text-white/70" /></div>
              </div>
            )
          }
          return (
            <motion.div key={group.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {group.agentType === 'CHAT' ? (
                <>
                  {/* Chat AI text messages always visible — like a normal chat */}
                  {group.messages.filter(m => !m.isThought && !m.isToolCall && m.eventType !== 'PROGRESS' && m.eventType !== 'PERMISSION_REQ').map((msg, msgIndex) => (
                    <div key={chatRenderKey(msg, msgIndex)} className={`px-3.5 py-2.5 rounded-lg text-[13px] leading-relaxed ${msg.eventType === 'ERROR' || msg.eventType === 'FATAL_ERROR' ? 'bg-red-500/[0.05] text-red-300/80' : 'text-white/80'}`}>
                      <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/40 [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-[12px] [&_code::before]:content-none [&_code::after]:content-none [&_code]:bg-white/[0.06] [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_p]:leading-relaxed [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:text-white/80 [&_h1]:text-white/90 [&_h2]:text-white/90 [&_h3]:text-white/90 [&_a]:text-purple-400 [&_a]:underline [&_a:hover]:text-purple-300 [&_blockquote]:border-l-purple-500/30 [&_blockquote]:text-white/50 [&_blockquote]:text-[12px] [&_hr]:border-white/[0.06] [&_table]:w-full [&_th]:text-left [&_th]:text-white/70 [&_th]:text-[11px] [&_th]:px-2 [&_th]:py-1 [&_td]:text-white/70 [&_td]:text-[12px] [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-white/[0.04]]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {/* Chat AI internals (thoughts, tool calls, progress) — collapsible */}
                  {group.messages.some(m => m.isThought || m.isToolCall || m.eventType === 'PROGRESS') && (
                    <AgentBlock agentType="SUPERVISOR" collapsible={true}>
                      {group.messages.filter(m => m.isThought || m.isToolCall || m.eventType === 'PROGRESS').map((msg, msgIndex) => (
                        <div key={chatRenderKey(msg, msgIndex)}>
                          {msg.isThought && <ThoughtBlock content={msg.content} />}
                          {msg.isToolCall && msg.toolName && <ToolCallRow toolName={msg.toolName} status={msg.status ?? 'RUNNING'} resultSummary={msg.resultSummary} />}
                          {msg.eventType === 'PROGRESS' && <ProgressBadge message={msg.content} status={msg.status ?? 'RUNNING'} />}
                        </div>
                      ))}
                    </AgentBlock>
                  )}
                </>
              ) : (
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
                          <div className={`px-3.5 py-2.5 rounded-lg text-[13px] leading-relaxed ${msg.eventType === 'ERROR' || msg.eventType === 'FATAL_ERROR' ? 'bg-red-500/[0.05] text-red-300/80' : 'text-white/80'}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AgentBlock>
              )}
            </motion.div>
          )
        })}

        <AnimatePresence>
          {isAgentRunning && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AgentBlock agentType={activeAgent ?? 'CHAT'}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1 h-1 rounded-full bg-purple-400/50"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/30">{activeAgent ? agentLabels[activeAgent] + ' is working...' : 'Thinking...'}</span>
                  <button onClick={stopAgent} className="ml-auto p-0.5 rounded bg-red-500/10 text-red-400/50 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Stop"><Square size={8} fill="currentColor" /></button>
                </div>
              </AgentBlock>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="relative flex items-end gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 focus-within:border-purple-500/30 focus-within:bg-white/[0.05] transition-all duration-200">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isAgentRunning ? 'Agent is working...' : 'Ask anything...'} disabled={isAgentRunning} rows={1}
            className="flex-1 bg-transparent text-[12.5px] text-white/80 placeholder:text-white/15 resize-none outline-none max-h-32 scrollbar-thin disabled:opacity-40 leading-relaxed" />
          {isAgentRunning ? (
            <button onClick={stopAgent} className="p-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors flex-shrink-0"><Square fill="currentColor" size={11} /></button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim() || !isConnected} className="p-1.5 rounded-md bg-[#6c3bf5] text-white disabled:opacity-30 hover:bg-[#6c3bf5]/80 transition-colors flex-shrink-0"><Send size={11} /></button>
          )}
        </div>
        <p className="text-[9px] text-white/10 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </motion.aside>
  )
}
