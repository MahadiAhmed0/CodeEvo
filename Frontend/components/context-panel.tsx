'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APITester } from './api-tester'
import {
  ChevronRight,
  Copy,
  Trash2,
  Settings,
  Lock,
  Zap,
} from 'lucide-react'

export function ContextPanel({ selectedNode }: any) {
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'properties' | 'api'>('properties')

  if (!expanded) {
    return (
      <button 
        onClick={() => setExpanded(true)}
        className="w-12 border-l border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
      >
        <ChevronRight className="w-5 h-5 -rotate-180" />
      </button>
    )
  }

  if (!selectedNode) {
    return (
      <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-sm">Inspector</h2>
          <button 
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4 -rotate-180" />
          </button>
        </div>
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          <div className="text-center py-8">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Select a node to view properties</p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">{selectedNode.name}</h2>
          <button 
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4 -rotate-180" />
          </button>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'properties'
                ? 'bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Properties
          </button>
          {selectedNode.type === 'service' && (
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'api'
                  ? 'bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              API Test
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Type Badge */}
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#004aad]/10 to-[#cb6ce6]/10 border border-gray-200">
              <p className="text-xs text-gray-600 uppercase font-semibold">Type</p>
              <p className="text-sm font-medium text-[#0b1c2c] capitalize mt-1">{selectedNode.type}</p>
            </div>

            {/* Configuration */}
            {selectedNode.type === 'service' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Name</label>
                  <Input 
                    defaultValue={selectedNode.name}
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Endpoints</label>
                  <div className="mt-2 space-y-2">
                    {selectedNode.endpoints?.map((endpoint: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1 rounded uppercase">{(typeof endpoint === 'string' ? 'GET' : endpoint.method) || 'GET'}</span>
                        {typeof endpoint === 'string' ? endpoint : endpoint.path}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedNode.type === 'database' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Engine</label>
                  <Input 
                    defaultValue={selectedNode.engine}
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Collections</label>
                  <div className="mt-2 space-y-2">
                    {selectedNode.collections?.map((col: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded border border-gray-200 text-sm">
                        <Lock className="w-3 h-3 text-gray-400" />
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
                  <label className="text-xs font-semibold text-gray-700 uppercase">Provider</label>
                  <Input 
                    defaultValue={selectedNode.provider}
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase">Topics</label>
                  <div className="mt-2 space-y-2">
                    {selectedNode.topics?.map((topic: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono text-xs">
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {selectedNode.type === 'service' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase mb-2 block">Dependencies</label>
                <div className="flex flex-wrap gap-2">
                  {['OrderService', 'UserDB'].map((dep, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'api' && selectedNode.type === 'service' && (
          <APITester nodes={[]} />
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button className="w-full justify-start text-sm" variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </Button>
        <Button className="w-full justify-start text-sm text-red-600" variant="outline" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </aside>
  )
}
