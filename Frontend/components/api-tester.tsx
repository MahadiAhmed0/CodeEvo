'use client'

import { useState, useCallback } from 'react'
import {
  Server,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Globe,
  Clock,
  Activity,
  FileJson,
  Folder,
  FolderOpen,
  Settings,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Node } from 'reactflow'

interface APITesterProps {
  nodes: Node[]
}

interface RequestHistoryEntry {
  id: string
  method: string
  endpoint: string
  status: number | string
  time: string
  duration?: string
}

const methodColors: Record<string, { text: string; bg: string; border: string; badge: string }> = {
  GET: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  POST: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  PUT: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  DELETE: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  PATCH: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
}

import { useDiagramStore } from '@/lib/store'

export function APITester({ nodes }: APITesterProps) {
  const { setShowProjectSettings } = useDiagramStore()
  const gatewayNodes = nodes.filter((n) => n.data.type === 'api' && n.data.gatewayConfig)
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    gatewayNodes[0]?.id || ''
  )
  const [method, setMethod] = useState('GET')
  const [endpoint, setEndpoint] = useState('/api/health')
  const [headers, setHeaders] = useState<Record<string, string>>({ 'Content-Type': 'application/json' })
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'params'>('headers')
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')
  const [history, setHistory] = useState<RequestHistoryEntry[]>([])
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({})
  const [bottomTab, setBottomTab] = useState<'history' | 'console'>('history')

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  // Initialize expanded state for gateways
  const toggleGatewayExpand = useCallback((nodeId: string) => {
    setExpandedServices(prev => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }, [])

  const selectRoute = useCallback((nodeId: string, route: any) => {
    setSelectedNodeId(nodeId)
    setEndpoint(route.pathPrefix || '/api/endpoint')
    setMethod(route.methods && route.methods.length > 0 && route.methods[0] !== 'ALL' ? route.methods[0] : 'GET')
  }, [])

  const handleSendRequest = async () => {
    setLoading(true)
    const startTime = Date.now()
    try {
      const port = selectedNode?.data?.port || 8080
      const url = `http://localhost:${port}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

      const res = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined,
      })
      const data = await res.json().catch(() => null)
      const duration = Date.now() - startTime

      const newResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers),
        body: data || { message: 'No JSON payload returned' },
        time: new Date().toLocaleTimeString(),
        duration: `${duration}ms`,
        size: JSON.stringify(data).length,
      }
      setResponse(newResponse)

      setHistory(prev => [{
        id: crypto.randomUUID(),
        method,
        endpoint,
        status: res.status,
        time: new Date().toLocaleTimeString(),
        duration: `${duration}ms`,
      }, ...prev].slice(0, 50))
    } catch (error) {
      const duration = Date.now() - startTime
      setResponse({
        status: 'ERROR',
        error: (error as Error).message,
        time: new Date().toLocaleTimeString(),
        duration: `${duration}ms`,
      })

      setHistory(prev => [{
        id: crypto.randomUUID(),
        method,
        endpoint,
        status: 'ERR',
        time: new Date().toLocaleTimeString(),
        duration: `${duration}ms`,
      }, ...prev].slice(0, 50))
    }
    setLoading(false)
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response?.body || response?.error, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusIcon = (status: number | string) => {
    if (status === 'ERROR' || status === 'ERR') return <XCircle size={14} className="text-red-400" />
    if (typeof status === 'number' && status >= 200 && status < 300) return <CheckCircle2 size={14} className="text-emerald-400" />
    if (typeof status === 'number' && status >= 400) return <AlertCircle size={14} className="text-amber-400" />
    return <Activity size={14} className="text-blue-400" />
  }

  const getStatusColor = (status: number | string) => {
    if (status === 'ERROR' || status === 'ERR') return 'text-red-400'
    if (typeof status === 'number' && status >= 200 && status < 300) return 'text-emerald-400'
    if (typeof status === 'number' && status >= 400) return 'text-red-400'
    return 'text-amber-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 z-0 bg-[#06080d] flex flex-col font-mono pt-[72px]"
    >
      {/* IDE Top Bar — mirrors code-viewer */}
      <div className="h-10 border-y border-white/[0.06] flex items-center justify-between px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-4 text-[12px] text-gray-400">
          <span className="flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            API Workspace
          </span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="flex items-center gap-1.5">
            <Globe size={12} />
            {selectedNode?.data?.name || 'No Service Selected'}
            <span className="text-white/20">:{selectedNode?.data?.port || 8080}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {response && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`font-bold ${getStatusColor(response.status)}`}>{response.status}</span>
              {response.duration && (
                <>
                  <span className="w-px h-3 bg-white/[0.1]" />
                  <span className="flex items-center gap-1 text-white/40">
                    <Clock size={10} />
                    {response.duration}
                  </span>
                </>
              )}
              {response.size && (
                <>
                  <span className="w-px h-3 bg-white/[0.1]" />
                  <span className="text-white/40">{response.size}B</span>
                </>
              )}
            </div>
          )}
          <Play size={14} className="text-emerald-400 cursor-pointer hover:text-emerald-300" onClick={handleSendRequest} />
          <Settings onClick={() => setShowProjectSettings(true)} size={14} className="text-gray-400 cursor-pointer hover:text-gray-200" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT SIDEBAR — Endpoint Explorer (mirrors file explorer) ===== */}
        <div className="w-64 border-r border-white/[0.06] bg-[#0a0e1a]/50 flex flex-col">
          <div className="p-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase flex items-center justify-between">
            Gateway Routes
            <Search size={12} className="cursor-pointer hover:text-gray-300" />
          </div>

          {/* Gateway selector */}
          <div className="px-3 pb-2">
            <div className="relative">
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="w-full appearance-none pl-7 pr-8 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] rounded-lg text-[11px] font-medium text-white/70 outline-none focus:border-purple-500/40 transition-all cursor-pointer"
              >
                <option value="" disabled className="bg-[#0d1220]">Select a gateway...</option>
                {gatewayNodes.map((n) => (
                  <option key={n.id} value={n.id} className="bg-[#0d1220] text-white">
                    {n.data.name || 'Unnamed Gateway'} (:{n.data.port || 8080})
                  </option>
                ))}
              </select>
              <Server className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Routes tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {gatewayNodes.map((gw) => {
              const isExpanded = expandedServices[gw.id] !== false
              const routes = gw.data.gatewayConfig?.routes || []
              return (
                <div key={gw.id}>
                  <div
                    className="flex items-center gap-2 py-1.5 px-3 cursor-pointer text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.04] select-none"
                    onClick={() => toggleGatewayExpand(gw.id)}
                  >
                    {isExpanded
                      ? <FolderOpen size={14} className="text-purple-400" />
                      : <Folder size={14} className="text-purple-400/70" />
                    }
                    <span className="flex-1 truncate">{gw.data.name}</span>
                    <span className="text-[10px] text-white/20 font-mono">:{gw.data.port}</span>
                  </div>
                  {isExpanded && routes.map((route: any, idx: number) => {
                    const path = route.pathPrefix
                    const routeMethod = route.methods && route.methods.length > 0 && route.methods[0] !== 'ALL' ? route.methods[0] : 'GET'
                    const isActive = selectedNodeId === gw.id && endpoint === path && method === routeMethod
                    const mc = methodColors[routeMethod] || methodColors.GET
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-1 py-1.5 px-3 cursor-pointer text-[12px] select-none transition-colors ${
                          isActive
                            ? 'bg-[#1e293b] text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                        style={{ paddingLeft: '28px' }}
                        onClick={() => selectRoute(gw.id, route)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mc.badge} shrink-0`}>
                            {routeMethod}
                          </span>
                          <span className="truncate font-mono text-[11px]">{path}</span>
                        </div>
                        <span className="text-[9px] text-white/30 truncate pl-8">→ {route.targetService}:{route.targetPort}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-[10px] text-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              {gatewayNodes.length} gateways · {gatewayNodes.reduce((acc, g) => acc + (g.data.gatewayConfig?.routes?.length || 0), 0)} routes
            </div>
          </div>
        </div>

        {/* ===== MAIN WORKSPACE ===== */}
        <div className="flex-1 flex flex-col bg-[#06080d]">
          {/* Request URL Bar — like the editor tab area */}
          <div className="flex h-auto bg-[#0a0e1a] border-b border-white/[0.06]">
            <div className="flex-1 flex items-center p-2 gap-2">
              {/* Method selector */}
              <div className="relative shrink-0">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={`appearance-none h-full pl-3 pr-8 py-2 border rounded-lg font-bold text-[12px] outline-none cursor-pointer ${
                    methodColors[method]?.badge || methodColors.GET.badge
                  }`}
                >
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                    <option key={m} value={m} className="bg-[#0d1220] text-white py-1">
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
              </div>

              {/* URL Input */}
              <div className="flex-1 flex items-center bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 gap-2 focus-within:border-purple-500/30 focus-within:bg-white/[0.04] transition-all">
                <span className="text-white/25 text-[11px] font-mono whitespace-nowrap shrink-0">
                  localhost:{selectedNode?.data?.port || 8080}
                </span>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/users"
                  className="flex-1 bg-transparent text-[13px] text-white/90 outline-none font-mono placeholder:text-white/20"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSendRequest}
                disabled={loading || !selectedNode}
                className="shrink-0 px-5 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] hover:from-[#7b4cf6] hover:to-[#d25cf2] text-white rounded-lg text-[12px] font-semibold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(108,59,245,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Zap className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Main content split — Request Config + Response */}
          <div className="flex-1 flex overflow-hidden">
            {/* Request Configuration Panel */}
            <div className="w-1/2 border-r border-white/[0.06] flex flex-col overflow-hidden">
              {/* Config Tabs */}
              <div className="flex gap-4 px-4 h-9 border-b border-white/[0.06] items-center text-[12px] uppercase tracking-wider font-semibold">
                {(['headers', 'body', 'params'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`transition-all ${
                      activeTab === tab
                        ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                        : 'text-gray-500 hover:text-gray-300 cursor-pointer'
                    }`}
                  >
                    {tab}
                    {tab === 'headers' && (
                      <span className="ml-1.5 text-[9px] text-white/20 font-normal">({Object.keys(headers).length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'headers' && (
                    <motion.div
                      key="headers"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-2"
                    >
                      {Object.entries(headers).map(([key, value], i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <input
                            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-purple-400/80 font-mono outline-none focus:border-purple-500/30 transition-all"
                            value={key}
                            readOnly
                            placeholder="Header key"
                          />
                          <input
                            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/60 font-mono outline-none focus:border-purple-500/30 transition-all"
                            value={value}
                            readOnly
                            placeholder="Header value"
                          />
                          <button className="p-1.5 rounded-lg text-white/10 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button className="flex items-center gap-1.5 text-[11px] text-purple-400/60 hover:text-purple-400 transition-colors mt-3">
                        <Plus size={12} />
                        Add Header
                      </button>
                    </motion.div>
                  )}

                  {activeTab === 'body' && (
                    <motion.div
                      key="body"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="h-full flex flex-col"
                    >
                      {method === 'GET' && (
                        <div className="flex items-center gap-2 text-[11px] text-amber-500/70 bg-amber-500/[0.06] border border-amber-500/10 rounded-lg px-3 py-2 mb-3">
                          <AlertCircle size={12} />
                          Request body is not sent with GET requests
                        </div>
                      )}
                      <div className="flex-1 relative min-h-[200px]">
                        <div className="px-3 py-1.5 bg-[#121826] border border-white/[0.08] border-b-0 rounded-t-lg flex items-center justify-between">
                          <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                          </div>
                          <span className="text-[10px] text-white/20 uppercase tracking-wider">JSON</span>
                        </div>
                        <textarea
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          disabled={method === 'GET'}
                          placeholder={'{\n  "key": "value"\n}'}
                          className="w-full h-full min-h-[180px] bg-[#0d1220] border border-white/[0.08] rounded-b-lg p-4 text-[12px] text-emerald-300/80 outline-none font-mono resize-none transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:border-purple-500/30 leading-relaxed"
                          spellCheck={false}
                        />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'params' && (
                    <motion.div
                      key="params"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col items-center justify-center text-white/20 py-12"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-3">
                        <FileJson className="w-5 h-5 opacity-40" />
                      </div>
                      <p className="text-[12px] font-medium text-white/30">No query parameters</p>
                      <p className="text-[11px] mt-1 text-white/15">Add params to append to the URL</p>
                      <button className="mt-4 flex items-center gap-1.5 text-[11px] text-purple-400/60 hover:text-purple-400 transition-colors">
                        <Plus size={12} />
                        Add Parameter
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Response Panel */}
            <div className="w-1/2 bg-[#0a0e17] flex flex-col overflow-hidden">
              {/* Response Tabs */}
              <div className="flex items-center justify-between px-4 h-9 border-b border-white/[0.06]">
                <div className="flex gap-4 items-center h-full text-[12px] uppercase tracking-wider font-semibold">
                  {(['body', 'headers'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResponseTab(tab)}
                      className={`transition-all ${
                        responseTab === tab
                          ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                          : 'text-gray-500 hover:text-gray-300 cursor-pointer'
                      }`}
                    >
                      {tab === 'body' ? 'Response' : 'Resp. Headers'}
                    </button>
                  ))}
                </div>
                {response && (
                  <button
                    onClick={copyResponse}
                    className="px-2.5 py-1 text-[10px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg flex items-center gap-1.5 transition-all text-white/40 hover:text-white/70 font-medium"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>

              {/* Response Content */}
              <div className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                  {!response ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 h-full flex flex-col items-center justify-center text-white/20 py-16"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
                        <Send className="w-6 h-6 opacity-30" />
                      </div>
                      <p className="text-[13px] font-medium text-white/30">Ready to send</p>
                      <p className="text-[11px] mt-1 text-white/15">Configure your request and hit Send</p>
                    </motion.div>
                  ) : responseTab === 'body' ? (
                    <motion.div
                      key="response-body"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col h-full"
                    >
                      {/* Status bar */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                        {getStatusIcon(response.status)}
                        <span className={`text-[14px] font-bold ${getStatusColor(response.status)}`}>
                          {response.status}
                        </span>
                        {response.statusText && (
                          <span className="text-[11px] text-white/40 px-2 py-0.5 rounded-full bg-white/[0.04]">
                            {response.statusText}
                          </span>
                        )}
                        <span className="flex-1" />
                        <span className="text-[10px] text-white/25 font-mono">{response.time}</span>
                      </div>

                      {/* JSON viewer with line numbers */}
                      <div className="flex-1 overflow-auto p-0">
                        <pre className="p-4 text-[12px] font-mono leading-relaxed">
                          {(JSON.stringify(response.body || response.error, null, 2) || '').split('\n').map((line: string, i: number) => (
                            <div key={i} className="flex group hover:bg-white/[0.02]">
                              <div className="w-10 flex-shrink-0 text-right pr-4 text-gray-600 select-none border-r border-white/[0.06] mr-4">{i + 1}</div>
                              <div className="flex-1 text-emerald-300/80 whitespace-pre-wrap break-all">{line}</div>
                            </div>
                          ))}
                        </pre>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="response-headers"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 space-y-1"
                    >
                      {response.headers ? (
                        Object.entries(response.headers).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex gap-3 py-1.5 border-b border-white/[0.03] text-[12px] font-mono">
                            <span className="text-purple-400/70 min-w-[140px] shrink-0">{key}</span>
                            <span className="text-white/50 break-all">{value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[12px] text-white/30 text-center py-8">No headers available</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM PANEL — History & Console (mirrors terminal area) ===== */}
      <div className="h-44 border-t border-white/[0.06] bg-[#0a0e1a] flex flex-col">
        <div className="flex gap-4 px-4 h-9 border-b border-white/[0.06] items-center text-[12px] uppercase tracking-wider font-semibold">
          <button
            onClick={() => setBottomTab('history')}
            className={`transition-all ${
              bottomTab === 'history'
                ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                : 'text-gray-500 hover:text-gray-300 cursor-pointer'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setBottomTab('console')}
            className={`transition-all ${
              bottomTab === 'console'
                ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                : 'text-gray-500 hover:text-gray-300 cursor-pointer'
            }`}
          >
            Console
          </button>
        </div>

        <div className="flex-1 p-3 overflow-y-auto text-[12px] text-gray-400 font-mono space-y-1">
          {bottomTab === 'history' ? (
            history.length > 0 ? (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  onClick={() => {
                    setEndpoint(entry.endpoint)
                    setMethod(entry.method)
                  }}
                >
                  {getStatusIcon(entry.status)}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    methodColors[entry.method]?.badge || methodColors.GET.badge
                  }`}>
                    {entry.method}
                  </span>
                  <span className="text-white/50 truncate flex-1">{entry.endpoint}</span>
                  <span className={`text-[11px] font-bold ${getStatusColor(entry.status)}`}>{entry.status}</span>
                  <span className="text-white/20 text-[10px]">{entry.duration}</span>
                  <span className="text-gray-500 text-[10px]">{entry.time}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 py-1">
                <span className="text-blue-400">[INFO]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>API Workspace initialized. Send a request to begin recording history.</span>
              </div>
            )
          ) : (
            <>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[INFO]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>API Workspace initialized successfully.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400"><CheckCircle2 size={14} /></span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span className="text-emerald-400">{nodes.filter(n => n.data.type === 'service').length} services detected in architecture.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[SYSTEM]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>Ready for testing. Select an endpoint from the explorer to begin.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
