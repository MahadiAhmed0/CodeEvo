'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ChevronRight,
  ChevronLeft,
  Database,
  Server,
  Network,
  Layers,
  Code2,
  Settings,
  History,
  GitCommit,
  Plus,
  GripVertical,
  Zap,
  Lock,
  Copy,
  Trash2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const nodeTypes = [
  { id: 'service', name: 'Service', description: 'Application logic & compute', icon: Server, color: '#6c3bf5', gradient: 'from-[#6c3bf5] to-[#8b5cf6]' },
  { id: 'api', name: 'API Gateway', description: 'API routing & gateway', icon: Network, color: '#10b981', gradient: 'from-[#10b981] to-[#34d399]' },
  { id: 'database', name: 'Database', description: 'Data storage system', icon: Database, color: '#f59e0b', gradient: 'from-[#f59e0b] to-[#fbbf24]' },
  { id: 'queue', name: 'Queue', description: 'Message broker & streaming', icon: Layers, color: '#c74cf0', gradient: 'from-[#c74cf0] to-[#e879f9]' },
]

interface SidebarProps {
  selectedNode?: any
  setSelectedNode?: (node: any) => void
  onDeleteNode?: (nodeId: string) => void
  onUpdateNode?: (nodeId: string, data: any) => void
}

export function Sidebar({ selectedNode, setSelectedNode, onDeleteNode, onUpdateNode }: SidebarProps) {
  const [expanded, setExpanded] = useState(true)
  const [activeSection, setActiveSection] = useState<'nodes' | 'history' | 'inspector'>('nodes')

  // Auto-switch to inspector when a node is selected
  const effectiveSection = selectedNode ? 'inspector' : activeSection

  const tabs = [
    { id: 'nodes' as const, label: 'Nodes', icon: Layers },
    { id: 'history' as const, label: 'History', icon: History },
  ]

  if (!expanded) {
    return (
      <div className="w-12 border-r border-white/[0.06] bg-[#0d1220] flex flex-col items-center py-3 gap-2">
        <button
          onClick={() => setExpanded(true)}
          className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className="w-6 h-px bg-white/[0.06] my-1" />
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSection(tab.id); setExpanded(true); }}
            className={`p-2 rounded-lg transition-all duration-200 ${
              effectiveSection === tab.id
                ? 'bg-purple-500/10 text-purple-400'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
            }`}
            title={tab.label}
          >
            <tab.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <aside className="w-72 border-r border-white/[0.06] bg-[#0d1220]/95 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white/80">Editor</span>
        </div>
        <button 
          onClick={() => setExpanded(false)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2.5 border-b border-white/[0.06]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSection(tab.id); if (selectedNode && setSelectedNode) setSelectedNode(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              effectiveSection === tab.id && !selectedNode
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
        {selectedNode && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Zap className="w-3.5 h-3.5" />
            Inspector
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {/* Nodes Tab */}
          {effectiveSection === 'nodes' && !selectedNode && (
            <motion.div
              key="nodes"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-4 space-y-3"
            >
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1">Node Library</p>
                <p className="text-[11px] text-white/20">Drag to add to canvas</p>
              </div>
              {nodeTypes.map(node => (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', node.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="group p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${node.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                      style={{ boxShadow: `0 4px 12px ${node.color}20` }}
                    >
                      <node.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/80 group-hover:text-white/95 transition-colors">{node.name}</p>
                      <p className="text-[11px] text-white/25 group-hover:text-white/35 transition-colors">{node.description}</p>
                    </div>
                    <GripVertical className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* History Tab */}
          {effectiveSection === 'history' && !selectedNode && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-4 space-y-2"
            >
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Recent Changes</p>
              {[
                { message: 'Add PaymentService', time: '2 min ago', commit: 'a1b2c3d', status: 'success' },
                { message: 'Connect OrderDB', time: '5 min ago', commit: 'x9y8z7w', status: 'success' },
                { message: 'Add POST /payments', time: '1 hour ago', commit: 'p2q3r4s', status: 'success' },
                { message: 'Initial architecture', time: '2 hours ago', commit: 'm4n5o6p', status: 'success' },
              ].map((item, i) => (
                <div key={i} className="group p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer transition-all duration-200 hover:bg-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <GitCommit className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">{item.message}</p>
                      <p className="text-[11px] text-white/25 mt-0.5">
                        <span className="font-mono text-purple-400/50">{item.commit}</span>
                        <span className="mx-1.5">•</span>
                        {item.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Inspector Tab - when node selected */}
          {selectedNode && (
            <motion.div
              key="inspector"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Node Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center">
                      {selectedNode.type === 'service' && <Server className="w-4 h-4 text-white" />}
                      {selectedNode.type === 'database' && <Database className="w-4 h-4 text-white" />}
                      {selectedNode.type === 'queue' && <Layers className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white/90">{selectedNode.name}</h3>
                      <span className="text-[10px] font-semibold text-purple-400/60 uppercase tracking-widest">{selectedNode.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode && setSelectedNode(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Type Badge */}
                <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/[0.06] to-pink-500/[0.06] border border-purple-500/[0.1]">
                  <p className="text-[10px] text-white/25 uppercase font-semibold tracking-wider">Type</p>
                  <p className="text-[13px] font-medium text-white/70 capitalize mt-0.5">{selectedNode.type}</p>
                </div>

                {/* Configuration Fields */}
                {selectedNode.type === 'service' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Name</label>
                      <input
                        value={selectedNode.name}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { name: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Language</label>
                      <Select 
                        value={selectedNode.language || 'go'} 
                        onValueChange={(val) => onUpdateNode?.(selectedNode.id, { language: val })}
                      >
                        <SelectTrigger className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border-white/[0.08] rounded-lg text-[13px] text-white/80 focus:ring-0 focus:ring-offset-0 focus:border-purple-500/30 transition-all duration-200">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1220] border-white/[0.08] text-white/80">
                          <SelectItem value="go">Go</SelectItem>
                          <SelectItem value="spring-boot">Spring Boot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Port</label>
                      <input
                        type="number"
                        value={selectedNode.port}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { port: parseInt(e.target.value) || 0 })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
                      />
                    </div>

                    {/* Endpoints */}
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Endpoints</label>
                      <div className="mt-2 space-y-1.5">
                        {selectedNode.endpoints?.map((endpoint: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 group">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[12px] font-mono flex-1">
                              <span className="text-[10px] text-emerald-500/40 font-sans font-semibold">GET</span>
                              <input
                                value={endpoint}
                                onChange={(e) => {
                                  const newEndpoints = [...(selectedNode.endpoints || [])]
                                  newEndpoints[i] = e.target.value
                                  onUpdateNode?.(selectedNode.id, { endpoints: newEndpoints })
                                }}
                                className="bg-transparent border-none outline-none text-emerald-400/70 w-full placeholder:text-white/20"
                                placeholder="/api/endpoint"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newEndpoints = (selectedNode.endpoints || []).filter((_: any, idx: number) => idx !== i)
                                onUpdateNode?.(selectedNode.id, { endpoints: newEndpoints })
                              }}
                              className="p-2 rounded-lg text-white/20 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newEndpoints = [...(selectedNode.endpoints || []), '/new-endpoint']
                            onUpdateNode?.(selectedNode.id, { endpoints: newEndpoints })
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/[0.1] text-white/40 text-[11px] font-medium hover:bg-white/[0.04] hover:border-white/[0.2] hover:text-white/60 transition-all duration-200"
                        >
                          <Plus className="w-3 h-3" />
                          Add Endpoint
                        </button>
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2 block">Dependencies</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['OrderService', 'UserDB'].map((dep, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white/[0.04] text-white/40 text-[11px] rounded-md border border-white/[0.06] font-medium">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'database' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Name</label>
                      <input
                        value={selectedNode.name}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { name: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Engine</label>
                      <input
                        value={selectedNode.engine || ''}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { engine: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Collections</label>
                      <div className="mt-2 space-y-1.5">
                        {selectedNode.collections?.map((col: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[12px] text-white/50">
                            <Lock className="w-3 h-3 text-amber-400/40" />
                            {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'queue' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Name</label>
                      <input
                        value={selectedNode.name}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { name: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Provider</label>
                      <input
                        value={selectedNode.provider || ''}
                        onChange={(e) => onUpdateNode?.(selectedNode.id, { provider: e.target.value })}
                        className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Topics</label>
                      <div className="mt-2 space-y-1.5">
                        {selectedNode.topics?.map((topic: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[11px] font-mono text-purple-400/60">
                            {topic}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer */}
              <div className="p-4 border-t border-white/[0.06] space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 text-xs font-medium hover:bg-white/[0.08] hover:text-white/70 transition-all duration-200">
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                <button 
                  onClick={() => {
                    if (onDeleteNode && selectedNode) {
                      onDeleteNode(selectedNode.id)
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/[0.1] text-red-400/60 text-xs font-medium hover:bg-red-500/[0.12] hover:text-red-400 transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Node
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!selectedNode && (
        <div className="p-3 border-t border-white/[0.06]">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.08] hover:text-white/60 transition-all duration-200">
            <Settings className="w-3.5 h-3.5" />
            Project Settings
          </button>
        </div>
      )}
    </aside>
  )
}
