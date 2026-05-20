'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  Zap,
  X,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  status?: 'thinking' | 'done'
  type?: 'text' | 'action' | 'code'
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'agent',
    content: 'Hello! I\'m your CodeEvo AI agent. I can help you design, modify, and generate code for your system architecture. What would you like to build?',
    timestamp: new Date(Date.now() - 300000),
    status: 'done',
    type: 'text',
  },
  {
    id: '2',
    role: 'user',
    content: 'Add a PaymentService with a POST /payments endpoint connected to OrderService',
    timestamp: new Date(Date.now() - 240000),
    type: 'text',
  },
  {
    id: '3',
    role: 'agent',
    content: '✓ Created PaymentService (Go, port 9000)\n✓ Added POST /payments endpoint\n✓ Connected OrderService → PaymentService via REST\n✓ Generated commit a1b2c3d4',
    timestamp: new Date(Date.now() - 200000),
    status: 'done',
    type: 'action',
  },
]

const quickActions = [
  { label: 'Add Service', icon: Zap },
  { label: 'Connect Nodes', icon: Sparkles },
  { label: 'Generate Code', icon: Bot },
]

export function AgentChat({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      type: 'text',
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `I'll help you with that. Analyzing your request: "${userMsg.content}"...\n\n✓ Plan generated\n✓ Executing changes\n✓ Verification passed`,
        timestamp: new Date(),
        status: 'done',
        type: 'action',
      }
      setMessages(prev => [...prev, agentMsg])
      setIsTyping(false)
    }, 2000)
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
      >
        <MessageSquare size={16} />
        Agent
      </motion.button>
    )
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full flex flex-col border-l border-white/[0.06] bg-[#0d1220]/95 backdrop-blur-xl overflow-hidden"
      style={{ width: 380 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Agent</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/40 font-medium">Online</span>
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

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setInput(action.label)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.1] transition-all duration-200"
          >
            <action.icon size={12} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'agent'
                ? 'bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] shadow-md shadow-purple-500/10'
                : 'bg-white/[0.08]'
            }`}>
              {msg.role === 'agent' ? (
                <Sparkles size={13} className="text-white" />
              ) : (
                <User size={13} className="text-white/60" />
              )}
            </div>

            {/* Content */}
            <div className={`group relative max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white rounded-tr-sm'
                  : msg.type === 'action'
                    ? 'bg-emerald-500/[0.08] border border-emerald-500/[0.12] text-emerald-300/90 rounded-tl-sm font-mono text-xs'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/80 rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Meta */}
              <div className={`flex items-center gap-2 mt-1 px-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                <span className="text-[10px] text-white/20">
                  {isMounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                {msg.role === 'agent' && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.06] rounded"
                  >
                    {copiedId === msg.id ? (
                      <Check size={10} className="text-emerald-400" />
                    ) : (
                      <Copy size={10} className="text-white/30" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/10">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="px-4 py-3 rounded-xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-purple-400/60"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/30 ml-1">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="relative flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-purple-500/30 focus-within:bg-white/[0.06] transition-all duration-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent anything..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20 resize-none outline-none max-h-24 scrollbar-thin"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-lg bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white disabled:opacity-30 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200 flex-shrink-0"
          >
            {isTyping ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </motion.aside>
  )
}
