'use client'

import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Canvas } from '@/components/canvas'
import { ContextPanel } from '@/components/context-panel'
import { AgentConsole } from '@/components/agent-console'
import { FloatingActions } from '@/components/floating-actions'
import { useState } from 'react'

export default function Home() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [agentRunning, setAgentRunning] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-white text-[#0b1c2c]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col">
            <Canvas selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
          </div>
          <ContextPanel selectedNode={selectedNode} />
        </main>
      </div>
      <FloatingActions />
      <AgentConsole running={agentRunning} setRunning={setAgentRunning} />
    </div>
  )
}
