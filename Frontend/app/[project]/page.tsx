'use client'

import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Canvas } from '@/components/canvas'
import { AgentChat } from '@/components/agent-chat'
import { AgentSidebar } from '@/components/agent-sidebar'
import { ProjectSettingsModal } from '@/components/project-settings-modal'
import { useState, use } from 'react'
import { useDiagramStore } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'

export default function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const unwrappedParams = use(params)
  const projectId = unwrappedParams.project

  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const agentOpen    = useDiagramStore(state => state.isChatbotExpanded)
  const setAgentOpen = useDiagramStore(state => state.setIsChatbotExpanded)
  const viewMode     = useDiagramStore(state => state.viewMode)

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] text-white overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left node-inspector sidebar — only in graph view */}
        <AnimatePresence initial={false}>
          {viewMode === 'graph' && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 'auto', opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="h-full flex overflow-hidden shrink-0"
            >
              <Sidebar
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                projectId={projectId}
                onDeleteNode={(id) => {
                  window.dispatchEvent(new CustomEvent('delete-diagram-node', { detail: { id } }))
                }}
                onUpdateNode={(id, data) => {
                  window.dispatchEvent(new CustomEvent('update-diagram-node', { detail: { id, data } }))
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main canvas area + right panels */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              projectId={projectId}
            />
          </div>

          {/* Agent Chat (slides from right edge) */}
          <AgentChat
            isOpen={agentOpen}
            setIsOpen={setAgentOpen}
            projectId={projectId}
            sessionId={projectId}
          />

          {/* Agent Sidebar — RAG Context + Diffs (always visible when graph mode) */}
          <AnimatePresence initial={false}>
            {viewMode === 'graph' && (
              <motion.div
                key="agent-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="h-full flex overflow-hidden shrink-0"
              >
                <AgentSidebar projectId={projectId} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <ProjectSettingsModal />
    </div>
  )
}
