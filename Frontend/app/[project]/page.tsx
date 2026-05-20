'use client'

import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Canvas } from '@/components/canvas'
import { AgentChat } from '@/components/agent-chat'
import { useState } from 'react'

export default function ProjectPage() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [agentOpen, setAgentOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
          </div>
          <AgentChat isOpen={agentOpen} setIsOpen={setAgentOpen} />
        </main>
      </div>
    </div>
  )
}
