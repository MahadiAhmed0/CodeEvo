'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ChevronRight,
  Database,
  Server,
  Network,
  Layers,
  Code2,
  Settings,
  History,
  GitCommit2,
  Plus,
} from 'lucide-react'

const nodeTypes = [
  { id: 'service', name: 'Service', description: 'Application logic & compute', icon: Server, color: '#004aad' },
  { id: 'api', name: 'API', description: 'API Gateway or Endpoint', icon: Network, color: '#10b981' },
  { id: 'database', name: 'Database', description: 'Data storage system', icon: Database, color: '#f59e0b' },
  { id: 'queue', name: 'Queue', description: 'Message broker & streaming', icon: Layers, color: '#cb6ce6' },
]

export function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const [activeSection, setActiveSection] = useState('nodes')

  if (!expanded) {
    return (
      <button 
        onClick={() => setExpanded(true)}
        className="w-12 border-r border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    )
  }

  return (
    <aside className="w-64 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-sm">Editor</h2>
        <button 
          onClick={() => setExpanded(false)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-200">
        {[
          { id: 'nodes', label: 'Nodes', icon: Layers },
          { id: 'versions', label: 'History', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? 'bg-gradient-to-r from-[#004aad]/10 to-[#cb6ce6]/10 text-[#004aad]'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {activeSection === 'nodes' && (
          <div className="space-y-3">
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Node Library</p>
              <p className="text-xs text-gray-500 mb-3">Drag nodes to canvas</p>
            </div>
            {nodeTypes.map(node => (
              <div
                key={node.id}
                draggable
                className="p-3 mb-2 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 cursor-move transition-all hover:shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{node.name}</p>
                    <p className="text-xs text-gray-500">{node.description}</p>
                  </div>
                  <node.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'versions' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Recent Changes</p>
            {[
              { message: 'Add PaymentService', time: '2 min ago', commit: 'a1b2c3d' },
              { message: 'Connect OrderDB', time: '5 min ago', commit: 'x9y8z7w' },
              { message: 'Add POST /payments', time: '1 hour ago', commit: 'p2q3r4s' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                <p className="text-sm font-medium text-gray-900">{item.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-mono">{item.commit}</span> • {item.time}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button variant="outline" className="w-full justify-start" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Project Settings
        </Button>
      </div>
    </aside>
  )
}
