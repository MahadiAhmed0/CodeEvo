'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  Loader2,
  Square,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Node } from 'reactflow'
import { dockerApi } from '@/lib/api'
import { toast } from 'sonner'
import { useDiagramStore } from '@/lib/store'
import { useAgentStore } from '@/lib/agent-store'
import { stompClient } from '@/lib/websocket'

interface APITesterProps {
  nodes: Node[]
  projectId?: string
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

interface TestableEndpoint {
  id: string
  method: string
  path: string
  target: string
  source: 'openapi' | 'controller' | 'graph'
  summary?: string
  pathParams?: Record<string, string>
}

const MONOLITH_PORT = 8080
const SAMPLE_UUID = '11111111-1111-4111-8111-111111111111'

export function APITester({ nodes, projectId }: APITesterProps) {
  const { setShowProjectSettings, dockerStatus, dockerProblems, setDockerStatus, setDockerLogs, previewUrl, setPreviewUrl } = useDiagramStore()
  const isAgentConnected = useAgentStore((state) => state.isConnected)
  const serviceNodes = nodes.filter((n) => 
    (n.data.type === 'api' && n.data.gatewayConfig?.routes?.length) || 
    (n.data.type === 'service' && n.data.endpoints?.length)
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    serviceNodes[0]?.id || ''
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
  
  // Test Runner State
  const [bottomTab, setBottomTab] = useState<'history' | 'console' | 'problems' | 'suite'>('history')
  const [testSuiteResults, setTestSuiteResults] = useState<any[]>([])
  const [isTestRunnerActive, setIsTestRunnerActive] = useState(false)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const mainGatewayNode = nodes.find((n) => n.data.type === 'api')
  const mainGatewayPort = mainGatewayNode?.data?.port || MONOLITH_PORT
  const sandboxBaseUrl = useMemo(() => {
    const base = dockerStatus === 'RUNNING' && previewUrl
      ? previewUrl
      : `http://localhost:${mainGatewayPort}`
    return base.replace(/\/$/, '')
  }, [dockerStatus, previewUrl, mainGatewayPort])
  const [openApiEndpoints, setOpenApiEndpoints] = useState<TestableEndpoint[]>([])
  const [controllerEndpoints, setControllerEndpoints] = useState<TestableEndpoint[]>([])
  const [isDiscoveringOpenApi, setIsDiscoveringOpenApi] = useState(false)

  const graphEndpoints = useMemo<TestableEndpoint[]>(() => {
    return serviceNodes.flatMap((node) => {
      const routes = node.data.type === 'api' && node.data.gatewayConfig
        ? (node.data.gatewayConfig.routes || []).map((r: any) => ({
            method: (r.methods && r.methods.length > 0 && r.methods[0] !== 'ALL') ? r.methods[0] : 'GET',
            path: r.pathPrefix,
            target: r.targetService || 'Internal'
          }))
        : (node.data.endpoints || []).map((e: any) => ({
            method: e.method || 'GET',
            path: e.path,
            target: node.data.name || 'Internal'
          }))

      return routes
        .filter((route: any) => route.path)
        .map((route: any) => ({
          id: `graph-${node.id}-${route.method}-${route.path}`,
          method: String(route.method || 'GET').toUpperCase(),
          path: route.path,
          target: route.target || node.data.name || 'Internal',
          source: 'graph' as const,
        }))
    })
  }, [serviceNodes])

  const activeEndpoints = openApiEndpoints.length > 0
    ? openApiEndpoints
    : controllerEndpoints.length > 0
      ? controllerEndpoints
      : graphEndpoints
  const endpointSourceLabel = openApiEndpoints.length > 0 ? 'OpenAPI' : controllerEndpoints.length > 0 ? 'Controllers' : 'Graph'
  const discoveredEndpoints = openApiEndpoints.length > 0 ? openApiEndpoints : controllerEndpoints
  const discoveredNodeId = openApiEndpoints.length > 0 ? 'openapi' : 'controllers'
  const discoveredTitle = openApiEndpoints.length > 0 ? 'OpenAPI Controllers' : 'Scanned Controllers'

  const discoverOpenApi = useCallback(async (silent = false) => {
    if (!projectId || dockerStatus !== 'RUNNING') {
      setOpenApiEndpoints([])
      return
    }

    setIsDiscoveringOpenApi(true)
    try {
      const res = await dockerApi.proxySandboxRequest(projectId, '/v3/api-docs', { cache: 'no-store' })
      if (!res.ok) throw new Error(`OpenAPI returned ${res.status}`)
      const spec = await res.json()
      const paths = spec?.paths || {}
      const discovered: TestableEndpoint[] = []
      const allowedMethods = new Set(['get', 'post', 'put', 'delete', 'patch'])

      Object.entries(paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods || {}).forEach(([methodName, operation]: [string, any]) => {
          if (!allowedMethods.has(methodName.toLowerCase())) return
          discovered.push({
            id: `openapi-${methodName}-${path}`,
            method: methodName.toUpperCase(),
            path,
            target: operation?.tags?.[0] || 'Controller',
            source: 'openapi',
            summary: operation?.summary || operation?.operationId,
            pathParams: extractOpenApiPathParams(operation),
          })
        })
      })

      setOpenApiEndpoints(discovered)
      setControllerEndpoints([])
      if (discovered.length > 0 && (!endpoint || endpoint === '/api/health')) {
        setSelectedNodeId('openapi')
        setMethod(discovered[0].method)
        setEndpoint(materializeEndpointPath(discovered[0].path, discovered[0].pathParams))
      }
      if (!silent && discovered.length > 0) toast.success(`Discovered ${discovered.length} API endpoints`)
    } catch (err) {
      setOpenApiEndpoints([])
      try {
        const scanned = await dockerApi.discoverSandboxEndpoints(projectId)
        const discovered = scanned.map((apiEndpoint) => ({
          id: apiEndpoint.id,
          method: apiEndpoint.method,
          path: apiEndpoint.path,
          target: apiEndpoint.filePath || 'Controller',
          source: 'controller' as const,
          summary: apiEndpoint.summary,
        }))
        setControllerEndpoints(discovered)
        if (discovered.length > 0 && (!endpoint || endpoint === '/api/health')) {
          setSelectedNodeId('controllers')
          setMethod(discovered[0].method)
          setEndpoint(materializeEndpointPath(discovered[0].path))
        }
        if (!silent && discovered.length > 0) toast.success(`Scanned ${discovered.length} controller endpoints`)
        if (!silent && discovered.length === 0) toast.error('OpenAPI docs unavailable. Using graph routes.')
      } catch {
        setControllerEndpoints([])
        if (!silent) toast.error('OpenAPI docs unavailable. Using graph routes.')
      }
    } finally {
      setIsDiscoveringOpenApi(false)
    }
  }, [projectId, dockerStatus, endpoint])

  useEffect(() => {
    if (dockerStatus === 'RUNNING') {
      discoverOpenApi(true)
    } else {
      setOpenApiEndpoints([])
      if (projectId) {
        dockerApi.discoverSandboxEndpoints(projectId)
          .then((scanned) => setControllerEndpoints(scanned.map((apiEndpoint) => ({
            id: apiEndpoint.id,
            method: apiEndpoint.method,
            path: apiEndpoint.path,
            target: apiEndpoint.filePath || 'Controller',
            source: 'controller' as const,
            summary: apiEndpoint.summary,
          }))))
          .catch(() => setControllerEndpoints([]))
      }
    }
  }, [dockerStatus, discoverOpenApi])

  useEffect(() => {
    if (!projectId || !isAgentConnected || !stompClient.isConnected) return

    const subId = stompClient.subscribeRaw(`/topic/project/${projectId}/docker-logs`, (msg) => {
      setDockerLogs(prev => {
        const newLogs = [...prev, msg.body]
        return newLogs.length > 500 ? newLogs.slice(newLogs.length - 500) : newLogs
      })

      if (msg.body.includes('[SYSTEM] Container started successfully')) {
        setDockerStatus('RUNNING')
      }
      if (msg.body.includes('network codeevo-proxy-net declared as external, but could not be found')) {
        setDockerStatus('FAILED')
        toast.error('Proxy network missing! Please run the Traefik proxy.')
      }
    })

    return () => stompClient.unsubscribe(subId)
  }, [projectId, isAgentConnected, setDockerLogs, setDockerStatus])

  // Initialize expanded state for gateways
  const toggleGatewayExpand = useCallback((nodeId: string) => {
    setExpandedServices(prev => ({ ...prev, [nodeId]: !prev[nodeId] }))
  }, [])

  const selectRoute = useCallback((nodeId: string, route: any) => {
    setSelectedNodeId(nodeId)
    setEndpoint(materializeEndpointPath(route.pathPrefix || route.path || '/api/endpoint', route.pathParams))
    setMethod(route.methods && route.methods.length > 0 && route.methods[0] !== 'ALL' ? route.methods[0] : 'GET')
  }, [])

  const handleSendRequest = async () => {
    setLoading(true)
    const startTime = Date.now()
    const requestEndpoint = resolveRequestEndpoint(endpoint, method)
    try {
      if (!projectId) throw new Error('No project selected')
      const res = await dockerApi.proxySandboxRequest(projectId, requestEndpoint, {
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
        endpoint: requestEndpoint,
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
        endpoint: requestEndpoint,
        status: 'ERR',
        time: new Date().toLocaleTimeString(),
        duration: `${duration}ms`,
      }, ...prev].slice(0, 50))
    }
    setLoading(false)
  }

  const handlePlay = async () => {
    if (!projectId) return
    setDockerLogs([]) // Clear previous logs
    setDockerStatus('BUILDING')
    try {
      const res = await dockerApi.startDocker(projectId)
      setDockerStatus(res.status)
      if (res.previewUrl) setPreviewUrl(res.previewUrl)
      toast.success('Container starting...')
    } catch (err: any) {
      setDockerStatus('FAILED')
      toast.error(err.message || 'Failed to start sandbox')
    }
  }

  const handleStop = async () => {
    if (!projectId) return
    try {
      await dockerApi.stopDocker(projectId)
      setDockerStatus('STOPPED')
      setDockerLogs(prev => [...prev, '[SYSTEM] Container stopped by user.'])
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop sandbox')
    }
  }

  const handleRestart = async () => {
    if (!projectId) return
    setDockerLogs([])
    setDockerStatus('BUILDING')
    try {
      const res = await dockerApi.restartDocker(projectId)
      setDockerStatus(res.status)
      if (res.previewUrl) setPreviewUrl(res.previewUrl)
      toast.success('Container restarting...')
    } catch (err: any) {
      setDockerStatus('FAILED')
      toast.error(err.message || 'Failed to restart sandbox')
    }
  }

  const generateMockPayload = (endpoint: string) => {
    const p = endpoint.toLowerCase()
    if (p.includes('user')) return { name: "Test User", email: "test@example.com", password: "password123" }
    if (p.includes('product')) return { name: "Test Product", price: 99.99, description: "A test product" }
    if (p.includes('order')) return { productId: 1, quantity: 2, status: "PENDING" }
    return { data: "test payload" }
  }

  const handleRunAllTests = async () => {
    const allTests = activeEndpoints.map((apiEndpoint) => ({
      id: crypto.randomUUID(),
      endpoint: materializeEndpointPath(apiEndpoint.path, apiEndpoint.pathParams),
      template: apiEndpoint.path,
      method: apiEndpoint.method,
      source: apiEndpoint.source,
      running: false,
    }))

    if (allTests.length === 0) return
    setTestSuiteResults(allTests)
    setBottomTab('suite')
    setIsTestRunnerActive(true)

    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i]
      setTestSuiteResults(prev => prev.map((t, idx) => idx === i ? { ...t, running: true } : t))
      
      let mockBody = undefined
      if (test.method === 'POST' || test.method === 'PUT') {
        mockBody = generateMockPayload(test.endpoint)
      }

      const startTime = Date.now()
      try {
        if (!projectId) throw new Error('No project selected')
        const res = await dockerApi.proxySandboxRequest(projectId, test.endpoint, {
          method: test.method,
          headers: { 'Content-Type': 'application/json' },
          body: mockBody ? JSON.stringify(mockBody) : undefined
        })
        const duration = Date.now() - startTime
        const passed = isExpectedSmokeStatus(test.method, test.template, res.status)

        setTestSuiteResults(prev => prev.map((t, idx) => idx === i ? { 
          ...t, 
          running: false, 
          status: res.status, 
          passed,
          duration: `${duration}ms`
        } : t))
      } catch (err) {
        const duration = Date.now() - startTime
        setTestSuiteResults(prev => prev.map((t, idx) => idx === i ? { 
          ...t, 
          running: false, 
          status: 'ERR', 
          passed: false,
          duration: `${duration}ms`
        } : t))
      }
    }
    setIsTestRunnerActive(false)
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

  function extractOpenApiPathParams(operation: any): Record<string, string> {
    const params: Record<string, string> = {}
    ;(operation?.parameters || [])
      .filter((param: any) => param?.in === 'path' && param?.name)
      .forEach((param: any) => {
        params[param.name] = sampleValueForPathParam(param.name, param.schema)
      })
    return params
  }

  function sampleValueForPathParam(name: string, schema?: any): string {
    const normalized = name.toLowerCase()
    const format = String(schema?.format || '').toLowerCase()
    const type = String(schema?.type || '').toLowerCase()
    if (format === 'uuid' || normalized.endsWith('id') || normalized === 'id') return SAMPLE_UUID
    if (type === 'integer' || type === 'number') return '1'
    if (normalized.includes('email')) return 'test@example.com'
    if (normalized.includes('slug')) return 'sample-slug'
    return 'sample'
  }

  function materializeEndpointPath(path: string, pathParams: Record<string, string> = {}): string {
    return path.replace(/\{([^}]+)\}/g, (_, rawName) => {
      const name = String(rawName).trim()
      return pathParams[name] || sampleValueForPathParam(name)
    })
  }

  function resolveRequestEndpoint(rawEndpoint: string, requestMethod: string): string {
    if (rawEndpoint.includes('{')) return materializeEndpointPath(rawEndpoint)

    const matchingTemplate = activeEndpoints.find((apiEndpoint) => {
      if (apiEndpoint.method !== requestMethod || !apiEndpoint.path.includes('{')) return false
      return pathMatchesTemplate(rawEndpoint, apiEndpoint.path)
    })

    if (matchingTemplate) {
      return materializeEndpointPath(matchingTemplate.path, matchingTemplate.pathParams)
    }

    return rawEndpoint
  }

  function pathMatchesTemplate(path: string, template: string): boolean {
    const cleanPath = path.split('?')[0]
    const pathParts = cleanPath.split('/').filter(Boolean)
    const templateParts = template.split('/').filter(Boolean)
    if (pathParts.length !== templateParts.length) return false
    return templateParts.every((part, index) => part.startsWith('{') && part.endsWith('}') || part === pathParts[index])
  }

  function isExpectedSmokeStatus(requestMethod: string, template: string, status: number): boolean {
    if (status >= 200 && status < 400) return true
    const hasPathParam = template.includes('{') && template.includes('}')
    if (requestMethod === 'GET' && hasPathParam && status === 404) return true
    if (requestMethod === 'DELETE' && hasPathParam && status === 404) return true
    return false
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
            {mainGatewayNode?.data?.name || 'Main Gateway'}
            <span className="text-white/20">:{mainGatewayPort}</span>
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
          {dockerStatus === 'STOPPED' || dockerStatus === 'FAILED' ? (
            <Play onClick={handlePlay} size={14} className="text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" />
          ) : dockerStatus === 'BUILDING' ? (
            <Loader2 size={14} className="text-emerald-400 animate-spin" />
          ) : (
            <>
              <Square onClick={handleStop} size={13} className="text-red-400 cursor-pointer hover:text-red-300 transition-colors" fill="currentColor" />
              <RefreshCw onClick={handleRestart} size={13} className="text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" />
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" title="Open Preview URL">
                  <ExternalLink size={13} className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer" />
                </a>
              )}
            </>
          )}
          <Settings onClick={() => setShowProjectSettings(true)} size={14} className="text-gray-400 cursor-pointer hover:text-gray-200 ml-1" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT SIDEBAR — Endpoint Explorer (mirrors file explorer) ===== */}
        <div className="w-64 border-r border-white/[0.06] bg-[#0a0e1a]/50 flex flex-col">
          <div className="p-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase flex items-center justify-between">
            API Routes
            <button
              onClick={() => discoverOpenApi(false)}
              disabled={dockerStatus !== 'RUNNING' || isDiscoveringOpenApi}
              className="text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Refresh controller discovery"
            >
              {isDiscoveringOpenApi ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            </button>
          </div>

          {/* Gateway selector */}
          <div className="px-3 pb-2">
            <div className="relative">
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="w-full appearance-none pl-7 pr-8 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] rounded-lg text-[11px] font-medium text-white/70 outline-none focus:border-purple-500/40 transition-all cursor-pointer"
              >
                <option value="" disabled className="bg-[#0d1220]">Select a route source...</option>
                {discoveredEndpoints.length > 0 && (
                  <option value={discoveredNodeId} className="bg-[#0d1220] text-white">
                    {discoveredTitle}
                  </option>
                )}
                {serviceNodes.map((n) => (
                  <option key={n.id} value={n.id} className="bg-[#0d1220] text-white">
                    {n.data.name || 'Unnamed Route Source'}
                  </option>
                ))}
              </select>
              <Server className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Routes tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {discoveredEndpoints.length > 0 ? (
              <div>
                <div
                  className="flex items-center gap-2 py-1.5 px-3 cursor-pointer text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.04] select-none"
                  onClick={() => toggleGatewayExpand(discoveredNodeId)}
                >
                  {expandedServices[discoveredNodeId] !== false
                    ? <FolderOpen size={14} className="text-purple-400" />
                    : <Folder size={14} className="text-purple-400/70" />
                  }
                  <span className="flex-1 truncate">{discoveredTitle}</span>
                </div>
                {expandedServices[discoveredNodeId] !== false && discoveredEndpoints.map((route) => {
                  const routeEndpoint = materializeEndpointPath(route.path, route.pathParams)
                  const isActive = selectedNodeId === discoveredNodeId && endpoint === routeEndpoint && method === route.method
                  const mc = methodColors[route.method] || methodColors.GET
                  return (
                    <div
                      key={route.id}
                      className={`flex flex-col gap-1 py-1.5 px-3 cursor-pointer text-[12px] select-none transition-colors ${
                        isActive
                          ? 'bg-[#1e293b] text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                      style={{ paddingLeft: '28px' }}
                      onClick={() => {
                        setSelectedNodeId(discoveredNodeId)
                        setEndpoint(routeEndpoint)
                        setMethod(route.method)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mc.badge} shrink-0`}>
                          {route.method}
                        </span>
                        <span className="truncate font-mono text-[11px]">{route.path}</span>
                      </div>
                      <span className="text-[9px] text-white/30 truncate pl-8">
                        {route.summary || route.target}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : serviceNodes.map((gw) => {
              const isExpanded = expandedServices[gw.id] !== false
              const routes = gw.data.type === 'api' && gw.data.gatewayConfig
                ? (gw.data.gatewayConfig.routes || []).map((r: any) => ({
                    method: (r.methods && r.methods.length > 0 && r.methods[0] !== 'ALL') ? r.methods[0] : 'GET',
                    path: r.pathPrefix,
                    target: r.targetService
                  }))
                : (gw.data.endpoints || []).map((e: any) => ({
                    method: e.method,
                    path: e.path,
                    target: 'Internal'
                  }))

              if (routes.length === 0) return null

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
                  </div>
                  {isExpanded && routes.map((route: any, idx: number) => {
                    const routeEndpoint = materializeEndpointPath(route.path, route.pathParams)
                    const isActive = selectedNodeId === gw.id && endpoint === routeEndpoint && method === route.method
                    const mc = methodColors[route.method] || methodColors.GET
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-1 py-1.5 px-3 cursor-pointer text-[12px] select-none transition-colors ${
                          isActive
                            ? 'bg-[#1e293b] text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                        style={{ paddingLeft: '28px' }}
                        onClick={() => {
                          setSelectedNodeId(gw.id)
                          setEndpoint(routeEndpoint)
                          setMethod(route.method)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mc.badge} shrink-0`}>
                            {route.method}
                          </span>
                          <span className="truncate font-mono text-[11px]">{route.path}</span>
                        </div>
                        <span className="text-[9px] text-white/30 truncate pl-8">→ {route.target}</span>
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
              {endpointSourceLabel} source - {activeEndpoints.length} endpoints
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
                  {sandboxBaseUrl.replace(/^https?:\/\//, '')}
                </span>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/users"
                  className="flex-1 bg-transparent text-[13px] text-white/90 outline-none font-mono placeholder:text-white/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendRequest}
                  disabled={loading || !endpoint || activeEndpoints.length === 0}
                  className="shrink-0 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg text-[12px] font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.08]"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Zap className="w-3.5 h-3.5" />
                    </motion.div>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send
                </button>
                <button
                  onClick={handleRunAllTests}
                  disabled={isTestRunnerActive || activeEndpoints.length === 0}
                  className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] hover:from-[#7b4cf6] hover:to-[#d25cf2] text-white rounded-lg text-[12px] font-semibold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(108,59,245,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isTestRunnerActive ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 className="w-3.5 h-3.5" />
                    </motion.div>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  Auto-Test All
                </button>
              </div>
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
          <button
            onClick={() => setBottomTab('problems')}
            className={`transition-all flex items-center gap-1.5 ${
              bottomTab === 'problems'
                ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                : 'text-gray-500 hover:text-gray-300 cursor-pointer'
            }`}
          >
            Problems
            {dockerProblems.length > 0 && (
              <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none">
                {dockerProblems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setBottomTab('suite')}
            className={`transition-all flex items-center gap-1.5 ${
              bottomTab === 'suite'
                ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]'
                : 'text-gray-500 hover:text-gray-300 cursor-pointer'
            }`}
          >
            Test Suite
            {testSuiteResults.length > 0 && (
              <span className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none">
                {testSuiteResults.filter(t => t.passed).length}/{testSuiteResults.length}
              </span>
            )}
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
          ) : bottomTab === 'console' ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[INFO]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>API Workspace initialized successfully.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400"><CheckCircle2 size={14} /></span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span className="text-emerald-400">{activeEndpoints.length} endpoints loaded from {endpointSourceLabel}.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[SYSTEM]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>Ready for testing. Select an endpoint or run Auto-Test All.</span>
              </div>
            </>
          ) : bottomTab === 'problems' ? (
            <div className="space-y-2">
              {dockerProblems.length === 0 ? (
                <div className="text-gray-500 italic">No sandbox problems detected from the current server logs.</div>
              ) : (
                dockerProblems.map((problem) => (
                  <div key={problem.id} className="flex items-start gap-3 py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    {problem.severity === 'error' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={problem.severity === 'error' ? 'text-red-400 font-semibold' : 'text-amber-400 font-semibold'}>
                          {problem.id}
                        </span>
                        <span className="text-white/25 uppercase text-[10px]">{problem.source}</span>
                        {problem.filePath && (
                          <span className="text-white/30 truncate">
                            {problem.filePath}{problem.line ? `:${problem.line}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-white/65 break-words">{problem.message}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {testSuiteResults.length > 0 ? (
                testSuiteResults.map((test) => (
                  <div key={test.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    {test.running ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Loader2 className="w-3.5 h-3.5 text-blue-400" />
                      </motion.div>
                    ) : test.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      methodColors[test.method]?.badge || methodColors.GET.badge
                    }`}>
                      {test.method}
                    </span>
                    <span className="text-white/70 font-mono text-[11px] flex-1">{test.endpoint}</span>
                    {test.status && (
                      <span className={`text-[11px] font-bold ${getStatusColor(test.status)}`}>{test.status}</span>
                    )}
                    {test.duration && (
                      <span className="text-white/30 text-[10px] font-mono">{test.duration}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-white/30">
                  <Play className="w-8 h-8 mb-2 opacity-20" />
                  <p>No tests run yet.</p>
                  <p className="text-[11px]">Click "Auto-Test All" to begin automated API testing.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
