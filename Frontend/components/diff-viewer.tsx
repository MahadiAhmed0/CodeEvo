'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, XCircle, FileCode2, ChevronDown, ChevronUp } from 'lucide-react'
import { DiffReadyPayload } from '@/lib/websocket'
import { useAgentStore } from '@/lib/agent-store'

interface DiffViewerProps {
  diff: DiffReadyPayload
  agentType: string
  token: string
  onDismiss: (token: string) => void
}

/**
 * Renders a side-by-side diff of a file change proposed by the Coding Agent.
 * Shows the original and modified content with line-level highlighting.
 * Provides Approve / Reject controls tied to the approval token.
 */
export function DiffViewer({ diff, agentType, token, onDismiss }: DiffViewerProps) {
  const { sendFeedback, sessionId } = useAgentStore()
  const [collapsed, setCollapsed] = useState(false)

  const originalLines = diff.originalContent.split('\n')
  const modifiedLines = diff.modifiedContent.split('\n')

  const handleApprove = () => {
    sendFeedback({ sessionId: sessionId ?? '', approvalToken: token, decision: 'APPROVE' })
    onDismiss(token)
  }

  const handleReject = () => {
    sendFeedback({ sessionId: sessionId ?? '', approvalToken: token, decision: 'REJECT' })
    onDismiss(token)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-white/[0.08] bg-[#0d1220]/90 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]
                      bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <FileCode2 size={14} className="text-purple-400" />
          <span className="text-[12px] font-semibold text-white/80 font-mono truncate max-w-[240px]">
            {diff.filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] text-white/30 font-mono">
            {diff.filePath}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60
                       transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => onDismiss(token)}
            className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60
                       transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Change description */}
      <div className="px-4 py-2 border-b border-white/[0.04] bg-purple-500/[0.04]">
        <p className="text-[11px] text-purple-300/80">{diff.changeDescription}</p>
      </div>

      {/* Diff content */}
      {!collapsed && (
        <div className="grid grid-cols-2 divide-x divide-white/[0.05] max-h-80 overflow-auto">
          {/* Original */}
          <div className="min-w-0">
            <div className="sticky top-0 px-3 py-1.5 bg-red-500/[0.08] border-b border-white/[0.04]">
              <span className="text-[10px] text-red-400/70 font-mono uppercase tracking-wider">
                Original
              </span>
            </div>
            <pre className="p-3 text-[11px] font-mono text-white/50 leading-relaxed overflow-x-auto">
              {originalLines.map((line, i) => {
                const isRemoved = !modifiedLines.includes(line) && line.trim() !== ''
                return (
                  <div
                    key={i}
                    className={`px-1 rounded ${isRemoved ? 'bg-red-500/10 text-red-300/80' : ''}`}
                  >
                    <span className="select-none text-white/15 mr-3 inline-block w-6 text-right">
                      {i + 1}
                    </span>
                    {line || ' '}
                  </div>
                )
              })}
            </pre>
          </div>

          {/* Modified */}
          <div className="min-w-0">
            <div className="sticky top-0 px-3 py-1.5 bg-emerald-500/[0.08] border-b border-white/[0.04]">
              <span className="text-[10px] text-emerald-400/70 font-mono uppercase tracking-wider">
                Modified
              </span>
            </div>
            <pre className="p-3 text-[11px] font-mono text-white/50 leading-relaxed overflow-x-auto">
              {modifiedLines.map((line, i) => {
                const isAdded = !originalLines.includes(line) && line.trim() !== ''
                return (
                  <div
                    key={i}
                    className={`px-1 rounded ${isAdded ? 'bg-emerald-500/10 text-emerald-300/80' : ''}`}
                  >
                    <span className="select-none text-white/15 mr-3 inline-block w-6 text-right">
                      {i + 1}
                    </span>
                    {line || ' '}
                  </div>
                )
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
        <p className="text-[11px] text-white/30 flex-1">
          {diff.requiresApproval ? 'Review changes before applying' : 'File has been written'}
        </p>
        {diff.requiresApproval && (
          <>
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-emerald-500/10 border border-emerald-500/20 text-emerald-300
                         text-[12px] font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Check size={12} />
              Apply
            </button>
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-red-500/10 border border-red-500/20 text-red-300
                         text-[12px] font-medium hover:bg-red-500/20 transition-colors"
            >
              <XCircle size={12} />
              Reject
            </button>
          </>
        )}
        {!diff.requiresApproval && (
          <button
            onClick={() => onDismiss(token)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]
                       text-white/40 text-[12px] font-medium hover:bg-white/[0.07] transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Floating panel showing all pending diffs and approval requests.
 * Renders in the top-right corner of the canvas area.
 */
export function DiffPanel() {
  const { pendingApprovals, dismissApproval } = useAgentStore()
  const diffApprovals = pendingApprovals.filter(a => a.type === 'DIFF')

  if (diffApprovals.length === 0) return null

  return (
    <div className="absolute top-4 right-4 z-30 w-[520px] space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {diffApprovals.map(approval => (
        <DiffViewer
          key={approval.token}
          diff={approval.payload as DiffReadyPayload}
          agentType={approval.agentType}
          token={approval.token}
          onDismiss={dismissApproval}
        />
      ))}
    </div>
  )
}
