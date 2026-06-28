'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, FileDiff, ChevronLeft, ChevronRight,
  Dot,
} from 'lucide-react'
import { RagContextPanel } from './rag-context-panel'
import { DiffViewer } from './diff-viewer'
import { useAgentStore } from '@/lib/agent-store'
import { DiffReadyPayload } from '@/lib/websocket'

type TabId = 'context' | 'diffs'

interface AgentSidebarProps {
  projectId: string
  isOpen: boolean
  onToggle: () => void
}

/**
 * Phase 2b: Agent Sidebar
 *
 * A collapsible right-hand panel docked next to the canvas.
 * Contains two tabs:
 *   1. Context  — RAG code search panel (auto-searches on each user message)
 *   2. Diffs    — all pending DIFF_READY events requiring user review
 *
 * The sidebar is independent of the AgentChat panel which slides in from
 * the right edge of the main area. This panel sits inside the main layout
 * as a resizable strip.
 */
export function AgentSidebar({ projectId, isOpen, onToggle }: AgentSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('context')

  const lastUserQuery  = useAgentStore(s => s.lastUserQuery)
  const pendingApprovals = useAgentStore(s => s.pendingApprovals)
  const dismissApproval  = useAgentStore(s => s.dismissApproval)
  const sendFeedback     = useAgentStore(s => s.sendFeedback)
  const sessionId        = useAgentStore(s => s.sessionId)

  const diffApprovals = pendingApprovals.filter(a => a.type === 'DIFF')
  const hasPendingDiffs = diffApprovals.length > 0

  // Auto-switch to Diffs tab when a new diff arrives
  // (handled by the badge — user decides to click)

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'context',
      label: 'Context',
      icon: <BookOpen size={13} />,
    },
    {
      id: 'diffs',
      label: 'Diffs',
      icon: <FileDiff size={13} />,
      badge: diffApprovals.length || undefined,
    },
  ]

  return (
    <div className="flex h-full shrink-0">
      {/* Collapse toggle strip */}
      <div className="relative flex flex-col items-center justify-center w-[22px] border-l border-white/[0.05] bg-[#0a0e1a]">
        <button
          onClick={onToggle}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1 text-white/20 hover:text-white/50 transition-colors rounded-sm hover:bg-white/[0.04]"
        >
          {isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Vertical label when collapsed */}
        {!isOpen && (
          <div className="absolute flex flex-col items-center gap-1 mt-4 top-10">
            {hasPendingDiffs && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Panel body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="sidebar-body"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="flex flex-col h-full border-l border-white/[0.05] bg-[#0a0e1a] overflow-hidden"
            style={{ width: 300 }}
          >
            {/* Tab bar */}
            <div className="flex items-center border-b border-white/[0.06] bg-[#0d1220]/60 px-2 pt-2 gap-1 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`agent-sidebar-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[12px] font-medium
                               transition-colors border-b-2 -mb-px
                               ${activeTab === tab.id
                                 ? 'text-white border-purple-500 bg-white/[0.04]'
                                 : 'text-white/30 border-transparent hover:text-white/60 hover:bg-white/[0.02]'
                               }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center
                                     w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'context' && (
                <RagContextPanel
                  projectId={projectId}
                  defaultQuery={lastUserQuery ?? ''}
                />
              )}

              {activeTab === 'diffs' && (
                <DiffsTab
                  diffs={diffApprovals}
                  sessionId={sessionId}
                  onDismiss={dismissApproval}
                  onApprove={(token) =>
                    sendFeedback({ sessionId: sessionId ?? '', approvalToken: token, decision: 'APPROVE' })
                  }
                  onReject={(token) =>
                    sendFeedback({ sessionId: sessionId ?? '', approvalToken: token, decision: 'REJECT' })
                  }
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Diffs Tab ────────────────────────────────────────────────────────────────

interface DiffsTabProps {
  diffs: ReturnType<typeof useAgentStore.getState>['pendingApprovals']
  sessionId: string | null
  onDismiss: (token: string) => void
  onApprove: (token: string) => void
  onReject:  (token: string) => void
}

function DiffsTab({ diffs, sessionId, onDismiss, onApprove, onReject }: DiffsTabProps) {
  if (diffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <FileDiff size={20} className="text-white/10" />
        <p className="text-[11px] text-white/20">No pending file changes</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-2 py-2 space-y-3">
      <AnimatePresence>
        {diffs.map(approval => (
          <DiffViewer
            key={approval.token}
            diff={approval.payload as DiffReadyPayload}
            agentType={approval.agentType}
            token={approval.token}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
