'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramStore } from '@/lib/store'
import { projectHistoryApi, githubRepoApi, type HistoryEntry } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GitHubRepoBadge } from '@/components/github-repo-badge'
import { 
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Database,
  Server,
  Network,
  Layers,
  Edit,
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
  Shield,
  Gauge,
  Globe,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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
  { id: 'api', name: 'Main Gateway', description: 'Monolith entrypoint & routing', icon: Network, color: '#10b981', gradient: 'from-[#10b981] to-[#34d399]' },
  { id: 'database', name: 'Database', description: 'Data storage system', icon: Database, color: '#f59e0b', gradient: 'from-[#f59e0b] to-[#fbbf24]' },
  { id: 'queue', name: 'Queue', description: 'Message broker & streaming', icon: Layers, color: '#c74cf0', gradient: 'from-[#c74cf0] to-[#e879f9]' },
]

interface SidebarProps {
  selectedNode?: any
  setSelectedNode?: (node: any) => void
  onDeleteNode?: (nodeId: string) => void
  onUpdateNode?: (nodeId: string, data: any) => void
  projectId?: string
}

function TableColumnEditor({ item, itemIndex, itemType, engine, onUpdate }: { item: any, itemIndex: number, itemType: 'Table' | 'Collection', engine: string, onUpdate: (newItem: any, action: 'update' | 'delete') => void }) {
  const [expanded, setExpanded] = useState(false)
  const name = typeof item === 'string' ? item : item.name || ''
  const columns = typeof item === 'string' ? [] : (item.columns || [])

  const dataTypes = engine === 'mongodb' 
    ? ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array', 'Object']
    : ['varchar', 'integer', 'boolean', 'timestamp', 'uuid', 'jsonb', 'text']

  return (
    <div className="group rounded-lg border border-white/[0.06] overflow-hidden bg-white/[0.02]">
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Lock className="w-3 h-3 text-amber-400/40" />
        <input
          value={name}
          onChange={(e) => onUpdate({ name: e.target.value, columns }, 'update')}
          className="bg-transparent border-none outline-none text-white/80 w-full placeholder:text-white/20 font-mono text-[12px]"
          placeholder={`${itemType.toLowerCase()}_name`}
        />
        <button
          onClick={() => onUpdate(item, 'delete')}
          className="p-1.5 rounded-lg text-white/20 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-2 border-t border-white/[0.06] bg-black/20 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">Columns</span>
            <button
              onClick={() => {
                const newCols = [...columns, { name: 'new_column', type: dataTypes[0] }]
                onUpdate({ name, columns: newCols }, 'update')
              }}
              className="text-[9px] text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" /> Add
            </button>
          </div>
          
          <div className="space-y-1.5">
            {columns.map((col: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 pl-1 group/col">
                <input
                  value={col.name}
                  onChange={(e) => {
                    const newCols = [...columns]
                    newCols[idx] = { ...col, name: e.target.value }
                    onUpdate({ name, columns: newCols }, 'update')
                  }}
                  className="bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 outline-none text-[11px] text-white/70 w-[90px] focus:border-purple-500/30 font-mono"
                  placeholder="name"
                />
                <Select
                  value={col.type || dataTypes[0]}
                  onValueChange={(val) => {
                    const newCols = [...columns]
                    newCols[idx] = { ...col, type: val }
                    onUpdate({ name, columns: newCols }, 'update')
                  }}
                >
                  <SelectTrigger className="flex-1 h-[26px] px-2 bg-white/[0.04] border-white/[0.06] rounded text-[11px] text-white/60 focus:ring-0 focus:ring-offset-0 focus:border-purple-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1220] border-white/[0.08] text-white/80 min-w-[100px]">
                    {dataTypes.map(dt => (
                      <SelectItem key={dt} value={dt} className="text-[11px] font-mono">{dt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => {
                    const newCols = columns.filter((_: any, cidx: number) => cidx !== idx)
                    onUpdate({ name, columns: newCols }, 'update')
                  }}
                  className="p-1 rounded text-white/20 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover/col:opacity-100 transition-all duration-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {columns.length === 0 && (
              <p className="text-[10px] text-white/20 text-center py-1">No columns yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ selectedNode, setSelectedNode, onDeleteNode, onUpdateNode, projectId }: SidebarProps) {
  const { setShowProjectSettings, setProjectSettingsTab } = useDiagramStore()
  const [expanded, setExpanded] = useState(true)
  const [linkedRepo, setLinkedRepo] = useState<{ fullName: string; activeBranch: string } | null>(null)

  useEffect(() => {
    if (projectId && projectId !== 'default') {
      githubRepoApi.getLinkedRepo(projectId)
        .then((data) => {
          if (data.linked && data.fullName && data.activeBranch) {
            setLinkedRepo({ fullName: data.fullName, activeBranch: data.activeBranch })
          }
        })
        .catch(() => {})
    }
  }, [projectId])
  const [activeSection, setActiveSection] = useState<'nodes' | 'history' | 'inspector'>('nodes')

  // ── History state ────────────────────────────────────────────────────────
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!projectId || projectId === 'default') return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await projectHistoryApi.getHistory(projectId)
      setHistoryEntries(data.content)
    } catch (err: any) {
      setHistoryError(err?.message ?? 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [projectId])

  // Fetch history when switching to the history tab
  useEffect(() => {
    if (activeSection === 'history') {
      fetchHistory()
    }
  }, [activeSection, fetchHistory])

  const handleRestore = async (entry: HistoryEntry) => {
    if (!projectId) return
    setRestoringId(entry.id)
    setConfirmRestoreId(null)
    try {
      await projectHistoryApi.restoreSnapshot(projectId, entry.id)
      toast.success('Diagram restored', {
        description: `Restored to snapshot ${entry.commitHash}`,
      })
      // Reload the page so the canvas picks up the restored diagram
      window.location.reload()
    } catch (err: any) {
      toast.error('Restore failed', { description: err?.message })
      setRestoringId(null)
    }
  }

  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hrs < 24) return `${hrs}h ago`
    return `${days}d ago`
  }

  const formatDelta = (delta: number) => {
    if (delta > 0) return `+${delta}`
    if (delta < 0) return `${delta}`
    return '±0'
  }

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
            <Edit className="w-3.5 h-3.5 text-white" />
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
      <div className="flex gap-1 px-3 py-2.5 border-b border-white/[0.06] overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSection(tab.id); if (selectedNode && setSelectedNode) setSelectedNode(null); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
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
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Recent Changes</p>
                <button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  className="p-1 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-40"
                  title="Refresh history"
                >
                  <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Loading state */}
              {historyLoading && historyEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                  <p className="text-[11px] text-white/25">Loading history…</p>
                </div>
              )}

              {/* Error state */}
              {historyError && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <AlertTriangle className="w-5 h-5 text-red-400/60" />
                  <p className="text-[11px] text-white/40 text-center">{historyError}</p>
                  <button
                    onClick={fetchHistory}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!historyLoading && !historyError && historyEntries.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <History className="w-6 h-6 text-white/10" />
                  <p className="text-[11px] text-white/25 text-center">No history yet.<br />Save the diagram to create a snapshot.</p>
                </div>
              )}

              {/* History entries */}
              {historyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <GitCommit className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors truncate">
                        {entry.message || 'Diagram saved'}
                      </p>
                      <p className="text-[11px] text-white/25 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-purple-400/50">{entry.commitHash}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(entry.createdAt)}</span>
                      </p>
                      {/* Node/edge delta badges */}
                      {(entry.nodeDelta !== 0 || entry.edgeDelta !== 0) && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {entry.nodeDelta !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                              entry.nodeDelta > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {entry.nodeDelta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              {formatDelta(entry.nodeDelta)} nodes
                            </span>
                          )}
                          {entry.edgeDelta !== 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                              entry.edgeDelta > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {entry.edgeDelta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              {formatDelta(entry.edgeDelta)} edges
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restore controls — appear on hover */}
                  {confirmRestoreId === entry.id ? (
                    <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
                      <p className="text-[10px] text-white/40 flex-1">Restore this snapshot?</p>
                      <button
                        onClick={() => handleRestore(entry)}
                        disabled={restoringId === entry.id}
                        className="px-2 py-1 text-[10px] font-medium rounded-md bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all disabled:opacity-50"
                      >
                        {restoringId === entry.id ? 'Restoring…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-2 py-1 text-[10px] font-medium rounded-md bg-white/[0.04] text-white/40 hover:text-white/70 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestoreId(entry.id)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.08] hover:border-purple-500/20 transition-all duration-200"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Restore
                    </button>
                  )}
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
                      {selectedNode.type === 'api' && <Network className="w-4 h-4 text-white" />}
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
                    {/* Methods */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Methods</label>
                        <button
                          onClick={() => {
                            const newMethods = [...(selectedNode.methods || []), { name: 'newMethod', type: 'query', description: '' }]
                            onUpdateNode?.(selectedNode.id, { methods: newMethods })
                          }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {selectedNode.methods?.map((method: any, i: number) => (
                          <div key={i} className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06] space-y-2 relative group">
                            <button
                              onClick={() => {
                                const newMethods = (selectedNode.methods || []).filter((_: any, idx: number) => idx !== i)
                                onUpdateNode?.(selectedNode.id, { methods: newMethods })
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-[#0d1220] border border-white/[0.06] rounded-full p-0.5 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>

                            <div className="flex items-center gap-2">
                              <select
                                value={method.type || 'query'}
                                onChange={(e) => {
                                  const newMethods = [...selectedNode.methods]
                                  newMethods[i] = { ...method, type: e.target.value }
                                  onUpdateNode?.(selectedNode.id, { methods: newMethods })
                                }}
                                className={`border border-white/[0.08] rounded text-[10px] font-mono outline-none px-1 py-1 ${
                                  method.type === 'mutation' ? 'text-amber-400 bg-amber-500/10' :
                                  method.type === 'handler' ? 'text-purple-400 bg-purple-500/10' :
                                  'text-blue-400 bg-blue-500/10'
                                }`}
                              >
                                <option value="query" className="bg-[#0d1220] text-blue-400">Query</option>
                                <option value="mutation" className="bg-[#0d1220] text-amber-400">Mutation</option>
                                <option value="handler" className="bg-[#0d1220] text-purple-400">Handler</option>
                              </select>
                              <input
                                value={method.name || ''}
                                onChange={(e) => {
                                  const newMethods = [...selectedNode.methods]
                                  newMethods[i] = { ...method, name: e.target.value }
                                  onUpdateNode?.(selectedNode.id, { methods: newMethods })
                                }}
                                className="bg-transparent border-none outline-none text-emerald-400/70 text-[12px] font-mono flex-1 placeholder:text-white/20"
                                placeholder="methodName"
                              />
                            </div>
                            <input
                              value={method.description || ''}
                              onChange={(e) => {
                                const newMethods = [...selectedNode.methods]
                                newMethods[i] = { ...method, description: e.target.value }
                                onUpdateNode?.(selectedNode.id, { methods: newMethods })
                              }}
                              className="w-full bg-transparent border border-white/[0.04] rounded px-2 py-1 text-[11px] text-white/50 outline-none focus:border-purple-500/30 placeholder:text-white/20"
                              placeholder="Description logic (optional)"
                            />
                          </div>
                        ))}
                        {(!selectedNode.methods || selectedNode.methods.length === 0) && (
                          <p className="text-[11px] text-white/30 text-center py-2">No methods configured</p>
                        )}
                      </div>
                    </div>

                    {/* External APIs */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">External APIs</label>
                        <button
                          onClick={() => {
                            const newApis = [...(selectedNode.externalAPIs || []), { name: 'NewAPI', baseUrl: 'https://api.example.com', description: '' }]
                            onUpdateNode?.(selectedNode.id, { externalAPIs: newApis })
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {selectedNode.externalAPIs?.map((api: any, i: number) => (
                          <div key={i} className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06] space-y-2 relative group">
                            <button
                              onClick={() => {
                                const newApis = (selectedNode.externalAPIs || []).filter((_: any, idx: number) => idx !== i)
                                onUpdateNode?.(selectedNode.id, { externalAPIs: newApis })
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-[#0d1220] border border-white/[0.06] rounded-full p-0.5 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>

                            <div>
                              <input
                                value={api.name || ''}
                                onChange={(e) => {
                                  const newApis = [...selectedNode.externalAPIs]
                                  newApis[i] = { ...api, name: e.target.value }
                                  onUpdateNode?.(selectedNode.id, { externalAPIs: newApis })
                                }}
                                className="w-full bg-transparent border-none outline-none text-cyan-400 text-[12px] font-medium placeholder:text-white/20 mb-1"
                                placeholder="API Name (e.g. Stripe)"
                              />
                              <input
                                value={api.baseUrl || ''}
                                onChange={(e) => {
                                  const newApis = [...selectedNode.externalAPIs]
                                  newApis[i] = { ...api, baseUrl: e.target.value }
                                  onUpdateNode?.(selectedNode.id, { externalAPIs: newApis })
                                }}
                                className="w-full bg-black/20 border border-white/[0.04] rounded px-2 py-1 text-[10px] text-white/60 font-mono outline-none focus:border-cyan-500/30 placeholder:text-white/20"
                                placeholder="https://api.example.com"
                              />
                            </div>
                            <input
                              value={api.description || ''}
                              onChange={(e) => {
                                const newApis = [...selectedNode.externalAPIs]
                                newApis[i] = { ...api, description: e.target.value }
                                onUpdateNode?.(selectedNode.id, { externalAPIs: newApis })
                              }}
                              className="w-full bg-transparent border border-white/[0.04] rounded px-2 py-1 text-[11px] text-white/50 outline-none focus:border-cyan-500/30 placeholder:text-white/20"
                              placeholder="Description (optional)"
                            />
                          </div>
                        ))}
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
                      <Select 
                        value={selectedNode.engine || 'postgres'} 
                        onValueChange={(val) => onUpdateNode?.(selectedNode.id, { engine: val })}
                      >
                        <SelectTrigger className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border-white/[0.08] rounded-lg text-[13px] text-white/80 focus:ring-0 focus:ring-offset-0 focus:border-purple-500/30 transition-all duration-200">
                          <SelectValue placeholder="Select Engine" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1220] border-white/[0.08] text-white/80">
                          <SelectItem value="postgres">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL</SelectItem>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(selectedNode.engine === 'postgres' || selectedNode.engine === 'mysql') && (
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Tables</label>
                          <button
                            onClick={() => {
                              const newTables = [...(selectedNode.tables || []), { name: 'new_table', columns: [] }]
                              onUpdateNode?.(selectedNode.id, { tables: newTables })
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {selectedNode.tables?.map((table: any, i: number) => (
                            <TableColumnEditor
                              key={i}
                              item={table}
                              itemIndex={i}
                              itemType="Table"
                              engine={selectedNode.engine}
                              onUpdate={(newItem, action) => {
                                const newTables = [...(selectedNode.tables || [])]
                                if (action === 'delete') {
                                  newTables.splice(i, 1)
                                } else {
                                  newTables[i] = newItem
                                }
                                onUpdateNode?.(selectedNode.id, { tables: newTables })
                              }}
                            />
                          ))}
                          {(!selectedNode.tables || selectedNode.tables.length === 0) && (
                            <p className="text-[11px] text-white/30 text-center py-2">No tables found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedNode.engine === 'mongodb' && (
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Collections</label>
                          <button
                            onClick={() => {
                              const newCols = [...(selectedNode.collections || []), { name: 'new_collection', columns: [] }]
                              onUpdateNode?.(selectedNode.id, { collections: newCols })
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {selectedNode.collections?.map((col: any, i: number) => (
                            <TableColumnEditor
                              key={i}
                              item={col}
                              itemIndex={i}
                              itemType="Collection"
                              engine={selectedNode.engine}
                              onUpdate={(newItem, action) => {
                                const newCols = [...(selectedNode.collections || [])]
                                if (action === 'delete') {
                                  newCols.splice(i, 1)
                                } else {
                                  newCols[i] = newItem
                                }
                                onUpdateNode?.(selectedNode.id, { collections: newCols })
                              }}
                            />
                          ))}
                          {(!selectedNode.collections || selectedNode.collections.length === 0) && (
                            <p className="text-[11px] text-white/30 text-center py-2">No collections found</p>
                          )}
                        </div>
                      </div>
                    )}
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

                {selectedNode.type === 'api' && (() => {
                  const gw = selectedNode.gatewayConfig || {
                    language: 'spring-boot',
                    routes: [],
                    auth: { enabled: false, type: 'none' },
                    rateLimit: { enabled: false, requestsPerMinute: 100 },
                    cors: { enabled: true, allowedOrigins: ['*'] },
                  }
                  const gatewayLanguage = gw.language || (gw.platform === 'express-proxy' ? 'node.js' : 'spring-boot')
                  return (
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Name</label>
                        <input
                          value={selectedNode.name}
                          onChange={(e) => onUpdateNode?.(selectedNode.id, { name: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>

                      {/* Port */}
                      <div>
                        <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Port</label>
                        <input
                          type="number"
                          value={selectedNode.port || 8080}
                          onChange={(e) => onUpdateNode?.(selectedNode.id, { port: parseInt(e.target.value) || 8080 })}
                          className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 transition-all duration-200"
                        />
                      </div>

                      {/* Language */}
                      <div>
                        <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Language</label>
                        <Select
                          value={gatewayLanguage}
                          onValueChange={(val) => {
                            const { platform, ...nextGw } = gw
                            onUpdateNode?.(selectedNode.id, { gatewayConfig: { ...nextGw, language: val } })
                          }}
                        >
                          <SelectTrigger className="w-full mt-1.5 px-3 py-2 bg-white/[0.04] border-white/[0.08] rounded-lg text-[13px] text-white/80 focus:ring-0 focus:ring-offset-0 focus:border-purple-500/30 transition-all duration-200">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0d1220] border-white/[0.08] text-white/80">
                            <SelectItem value="spring-boot">Spring Boot</SelectItem>
                            <SelectItem value="node.js">Node.js</SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Routes */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Routes</label>
                          <button
                            onClick={() => {
                              const newRoute = {
                                id: crypto.randomUUID(),
                                pathPrefix: '/api/new',
                                targetService: 'ServiceName',
                                methods: ['ALL'],
                                stripPrefix: false,
                              }
                              onUpdateNode?.(selectedNode.id, {
                                gatewayConfig: { ...gw, routes: [...gw.routes, newRoute] }
                              })
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="mt-2 space-y-2">
                          {gw.routes.map((route: any, i: number) => (
                            <div key={route.id || i} className="p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06] space-y-2 relative group">
                              <button
                                onClick={() => {
                                  const newRoutes = gw.routes.filter((_: any, idx: number) => idx !== i)
                                  onUpdateNode?.(selectedNode.id, {
                                    gatewayConfig: { ...gw, routes: newRoutes }
                                  })
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-[#0d1220] border border-white/[0.06] rounded-full p-0.5 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>

                              {/* Path prefix */}
                              <div>
                                <label className="text-[9px] text-white/20 uppercase">Path Prefix</label>
                                <input
                                  value={route.pathPrefix}
                                  onChange={(e) => {
                                    const newRoutes = [...gw.routes]
                                    newRoutes[i] = { ...route, pathPrefix: e.target.value }
                                    onUpdateNode?.(selectedNode.id, { gatewayConfig: { ...gw, routes: newRoutes } })
                                  }}
                                  className="w-full bg-transparent border border-white/[0.04] rounded px-2 py-1 text-[12px] text-emerald-400/70 font-mono outline-none focus:border-purple-500/30"
                                  placeholder="/api/users"
                                />
                              </div>

                              {/* Target service */}
                              <div>
                                <label className="text-[9px] text-white/20 uppercase">Target Service</label>
                                <input
                                  value={route.targetService}
                                  onChange={(e) => {
                                    const newRoutes = [...gw.routes]
                                    newRoutes[i] = { ...route, targetService: e.target.value }
                                    onUpdateNode?.(selectedNode.id, { gatewayConfig: { ...gw, routes: newRoutes } })
                                  }}
                                  className="w-full bg-transparent border border-white/[0.04] rounded px-2 py-1 text-[12px] text-white/60 outline-none focus:border-purple-500/30"
                                  placeholder="UserService"
                                />
                              </div>

                              {/* Methods */}
                              <div>
                                <label className="text-[9px] text-white/20 uppercase">Methods</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map(m => {
                                    const isActive = route.methods.includes(m) || (m === 'ALL' && route.methods.includes('ALL'))
                                    return (
                                      <button
                                        key={m}
                                        onClick={() => {
                                          const newRoutes = [...gw.routes]
                                          let newMethods: string[]
                                          if (m === 'ALL') {
                                            newMethods = ['ALL']
                                          } else {
                                            const filtered = route.methods.filter((x: string) => x !== 'ALL')
                                            newMethods = isActive
                                              ? filtered.filter((x: string) => x !== m)
                                              : [...filtered, m]
                                            if (newMethods.length === 0) newMethods = ['ALL']
                                          }
                                          newRoutes[i] = { ...route, methods: newMethods }
                                          onUpdateNode?.(selectedNode.id, { gatewayConfig: { ...gw, routes: newRoutes } })
                                        }}
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                                          isActive
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                            : 'bg-white/[0.02] text-white/25 border-white/[0.06] hover:text-white/50'
                                        }`}
                                      >
                                        {m}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Strip prefix toggle */}
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={route.stripPrefix || false}
                                  onChange={(e) => {
                                    const newRoutes = [...gw.routes]
                                    newRoutes[i] = { ...route, stripPrefix: e.target.checked }
                                    onUpdateNode?.(selectedNode.id, { gatewayConfig: { ...gw, routes: newRoutes } })
                                  }}
                                  className="rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                                />
                                <span className="text-[10px] text-white/40">Strip prefix before forwarding</span>
                              </label>
                            </div>
                          ))}
                          {gw.routes.length === 0 && (
                            <p className="text-[11px] text-white/30 text-center py-2">No routes configured</p>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/[0.06]" />

                      {/* Middleware Section */}
                      <div>
                        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-3">Middleware</p>

                        {/* Auth */}
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2 mb-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
                              <Shield className="w-3.5 h-3.5 text-blue-400" />
                              Authentication
                            </span>
                            <input
                              type="checkbox"
                              checked={gw.auth.enabled}
                              onChange={(e) => onUpdateNode?.(selectedNode.id, {
                                gatewayConfig: { ...gw, auth: { ...gw.auth, enabled: e.target.checked } }
                              })}
                              className="rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                          </label>
                          {gw.auth.enabled && (
                            <Select
                              value={gw.auth.type}
                              onValueChange={(val) => onUpdateNode?.(selectedNode.id, {
                                gatewayConfig: { ...gw, auth: { ...gw.auth, type: val } }
                              })}
                            >
                              <SelectTrigger className="w-full h-8 px-2 bg-white/[0.04] border-white/[0.06] rounded text-[11px] text-white/60 focus:ring-0 focus:ring-offset-0 focus:border-purple-500/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0d1220] border-white/[0.08] text-white/80 min-w-[100px]">
                                <SelectItem value="jwt" className="text-[11px]">JWT Bearer</SelectItem>
                                <SelectItem value="api-key" className="text-[11px]">API Key</SelectItem>
                                <SelectItem value="none" className="text-[11px]">None</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Rate Limiting */}
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2 mb-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
                              <Gauge className="w-3.5 h-3.5 text-amber-400" />
                              Rate Limiting
                            </span>
                            <input
                              type="checkbox"
                              checked={gw.rateLimit.enabled}
                              onChange={(e) => onUpdateNode?.(selectedNode.id, {
                                gatewayConfig: { ...gw, rateLimit: { ...gw.rateLimit, enabled: e.target.checked } }
                              })}
                              className="rounded border-white/20 bg-white/[0.04] text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                          </label>
                          {gw.rateLimit.enabled && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={gw.rateLimit.requestsPerMinute}
                                onChange={(e) => onUpdateNode?.(selectedNode.id, {
                                  gatewayConfig: { ...gw, rateLimit: { ...gw.rateLimit, requestsPerMinute: parseInt(e.target.value) || 100 } }
                                })}
                                className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 outline-none text-[11px] text-white/70 font-mono focus:border-purple-500/30"
                              />
                              <span className="text-[10px] text-white/30 whitespace-nowrap">req/min</span>
                            </div>
                          )}
                        </div>

                        {/* CORS */}
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
                              <Globe className="w-3.5 h-3.5 text-purple-400" />
                              CORS
                            </span>
                            <input
                              type="checkbox"
                              checked={gw.cors.enabled}
                              onChange={(e) => onUpdateNode?.(selectedNode.id, {
                                gatewayConfig: { ...gw, cors: { ...gw.cors, enabled: e.target.checked } }
                              })}
                              className="rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                          </label>
                          {gw.cors.enabled && (
                            <div>
                              <label className="text-[9px] text-white/20 uppercase">Allowed Origins</label>
                              <input
                                value={gw.cors.allowedOrigins.join(', ')}
                                onChange={(e) => onUpdateNode?.(selectedNode.id, {
                                  gatewayConfig: { ...gw, cors: { ...gw.cors, allowedOrigins: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } }
                                })}
                                className="w-full bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 outline-none text-[11px] text-white/60 font-mono focus:border-purple-500/30 mt-1"
                                placeholder="*, https://example.com"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
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
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          {linkedRepo && (
            <GitHubRepoBadge
              fullName={linkedRepo.fullName}
              branch={linkedRepo.activeBranch}
              onClick={() => {
                setProjectSettingsTab('github')
                setShowProjectSettings(true)
              }}
            />
          )}
          <button 
            onClick={() => {
              setProjectSettingsTab('env')
              setShowProjectSettings(true)
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.08] hover:text-white/60 transition-all duration-200"
          >
            <Settings className="w-3.5 h-3.5" />
            Project Settings
          </button>
        </div>
      )}
    </aside>
  )
}
