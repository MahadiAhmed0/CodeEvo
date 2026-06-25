import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Folder, 
  FolderOpen, 
  FileCode2, 
  FileJson, 
  FileText, 
  X,
  Play,
  Settings,
  Search,
  CheckCircle2,
  GitBranch,
  AlertCircle,
  Loader2,
  Square,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { projectCodeApi, dockerApi } from '@/lib/api'
import { toast } from 'sonner'
import { useDiagramStore } from '@/lib/store'
import { useAgentStore } from '@/lib/agent-store'

// Basic syntax highlighting colors
const colors = {
  keyword: 'text-pink-400',
  string: 'text-emerald-400',
  function: 'text-blue-400',
  comment: 'text-gray-500',
  number: 'text-orange-400',
  default: 'text-gray-300'
}

interface CodeViewerProps {
  nodes: any[]
  edges: any[]
  projectId?: string
}

// ─── File icons ──────────────────────────────────────────────────────────────

const getFileIcon = (name: string) => {
  if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />
  if (name.endsWith('.java') || name.endsWith('.go') || name.endsWith('.js') || name.endsWith('.ts')) return <FileCode2 size={14} className="text-blue-400" />
  if (name.endsWith('.xml') || name.endsWith('.yml') || name.endsWith('.yaml')) return <FileText size={14} className="text-red-400" />
  return <FileText size={14} className="text-gray-400" />
}

// ─── File tree item ──────────────────────────────────────────────────────────

const FileTreeItem = ({ item, level = 0, onSelectFile, activeFile }: any) => {
  const [isOpen, setIsOpen] = useState(level < 2) // Auto-open root folders

  if (item.type === 'file') {
    const isActive = activeFile?.name === item.name && activeFile?.content === item.content
    return (
      <div 
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer text-[13px] select-none transition-colors ${isActive ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => onSelectFile(item)}
      >
        {getFileIcon(item.name)}
        {item.name}
      </div>
    )
  }

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 px-2 cursor-pointer text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.04] select-none"
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FolderOpen size={14} className="text-purple-400" /> : <Folder size={14} className="text-purple-400/70" />}
        {item.name}
      </div>
      {isOpen && item.children && Object.values(item.children).map((child: any, i) => (
        <FileTreeItem key={i} item={child} level={level + 1} onSelectFile={onSelectFile} activeFile={activeFile} />
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CodeViewer({ nodes, edges, projectId }: CodeViewerProps) {
  const { setShowProjectSettings, dockerStatus, setDockerStatus, dockerLogs, setDockerLogs, previewUrl, setPreviewUrl } = useDiagramStore()

  // State: backend tree, loading, and whether backend has files
  const [backendTree, setBackendTree] = useState<Record<string, any> | null>(null)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [hasBackendFiles, setHasBackendFiles] = useState(false)

  const { events } = useAgentStore()
  const processedIndexRef = React.useRef<number>(0)

  const loadTree = (isInitial = false) => {
    if (!projectId) return

    if (isInitial) setIsLoadingCode(true)
    projectCodeApi.getFileTree(projectId)
      .then((treeResponse) => {
        if (treeResponse.totalFiles > 0) {
          setBackendTree(treeResponse.tree)
          setHasBackendFiles(true)
          
          // If we have an active file open, attempt to update its content to the latest version
          setActiveFile((prevActive) => {
            if (!prevActive) return null
            // Recursive search to find the updated file content in the new tree
            const findUpdatedFile = (treeNode: any): any => {
              for (const key in treeNode) {
                const item = treeNode[key]
                if (item.type === 'file' && item.name === prevActive.name) {
                  return item // Found the updated file object
                }
                if (item.children) {
                  const found = findUpdatedFile(item.children)
                  if (found) return found
                }
              }
              return null
            }
            const updated = findUpdatedFile(treeResponse.tree)
            return updated || prevActive
          })
        } else {
          setHasBackendFiles(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load code files:', err)
        if (isInitial) setHasBackendFiles(false)
      })
      .finally(() => {
        if (isInitial) setIsLoadingCode(false)
      })
  }

  // Load backend code files when the viewer mounts
  useEffect(() => {
    loadTree(true)
    
    // Check initial docker status
    if (projectId) {
      dockerApi.getDockerStatus(projectId).then(res => {
        setDockerStatus(res.status)
        if (res.previewUrl) setPreviewUrl(res.previewUrl)
      }).catch(console.error)
    }
  }, [projectId])

  // Subscribe to Docker logs via WebSocket
  useEffect(() => {
    if (!projectId) return
    const { stompClient } = useAgentStore.getState()
    if (!stompClient || !stompClient.connected) return

    const subId = stompClient.subscribeRaw(`/topic/project/${projectId}/docker-logs`, (msg) => {
      setDockerLogs(prev => {
        const newLogs = [...prev, msg.body]
        // keep last 500 lines to prevent memory issues
        if (newLogs.length > 500) return newLogs.slice(newLogs.length - 500)
        return newLogs
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
  }, [projectId, useAgentStore.getState().isConnected])

  // Auto-refresh whenever the agent creates/edits a file or finishes a task
  useEffect(() => {
    if (!events.length) {
      processedIndexRef.current = 0
      return
    }

    const newEvents = events.slice(processedIndexRef.current)
    processedIndexRef.current = events.length

    let shouldLoadTree = false

    newEvents.forEach(event => {
      if (event.type === 'DIFF_READY') {
        const payload = event.payload as any
        // 1. Instantly use the push response payload to show the code (SSE style)
        setActiveFile((prevActive) => {
          const eventFileName = payload.filePath.split('/').pop()
          if (prevActive && prevActive.name === eventFileName) {
            return { ...prevActive, content: payload.modifiedContent }
          }
          // If no file is open and this is the first file, or to auto-switch to newly edited file:
          return { name: eventFileName, content: payload.modifiedContent, type: 'file' }
        })
        shouldLoadTree = true
      } else if (event.type === 'TASK_COMPLETE') {
        shouldLoadTree = true
      }
    })

    if (shouldLoadTree) {
      // 2. Silently pull the tree in the background just to update the sidebar folder structure
      loadTree(false)
    }
  }, [events])

  // Use backend tree
  const fileTree = backendTree || {}

  const [activeFile, setActiveFile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'terminal' | 'logs' | 'problems'>('terminal')

  // Auto-select first file when tree loads
  useEffect(() => {
    if (!activeFile && Object.keys(fileTree).length > 0) {
      const firstFile = findFirstFile(fileTree)
      if (firstFile) setActiveFile(firstFile)
    }
  }, [fileTree, activeFile])

  const handlePlay = async () => {
    if (!projectId) return
    setDockerLogs([]) // Clear previous logs
    setActiveTab('terminal')
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
    setActiveTab('terminal')
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

  const problems = [
    { id: 'ERR-USER-01', type: 'error', message: 'Connection to PaymentService (port 9000) failed. Connection refused.', file: 'UserService/main.go', line: 42 },
    { id: 'WARN-ORD-01', type: 'warning', message: 'OrderService DB URI not found, using fallback in-memory store.', file: 'OrderService/application.yml', line: 15 }
  ]

  // Decodes HTML entities that the LLM may have injected (e.g. &lt; -> <).
  // Does NOT strip XML or angle-bracket tags so pom.xml and generics render correctly.
  const sanitizeCode = (content: string): string => {
    return content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  // Syntax highlighting (HTML-safe)
  const renderCode = (content: string) => {
    const clean = sanitizeCode(content)
    return clean.split('\n').map((line, i) => {
      // STEP 1: Escape HTML entities so < > & " in raw code are never treated as HTML tags
      let escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

      // STEP 2: Apply highlighting on the safely escaped string
      // We use (?![^<]*>) to ensure we don't accidentally match and replace text INSIDE an already-inserted HTML tag.
      let highlightedLine = escaped
        .replace(/\b(package|import|public|private|protected|class|static|void|final|new|return|if|else|for|while|try|catch|throws|extends|implements|interface|enum|abstract|super|this|null|true|false|const|require|module|func|go|type|struct)\b(?![^<]*>)/g,
          `<span class="${colors.keyword}">$1</span>`)
        .replace(/\b(String|int|long|boolean|double|float|char|byte|short|Integer|Long|Boolean|List|Map|Set|Optional|UUID|void)\b(?![^<]*>)/g,
          `<span class="${colors.function}">$1</span>`)
        .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)(?![^<]*>)/g,
          `<span class="${colors.string}">$1</span>`)
        .replace(/(\/\/.*)(?![^<]*>)/g,
          `<span class="${colors.comment}">$1</span>`)
        .replace(/\b(\d+)\b(?![^<]*>)/g,
          `<span class="${colors.number}">$1</span>`)

      return (
        <div key={i} className="flex group hover:bg-white/[0.02]">
          <div className="w-10 flex-shrink-0 text-right pr-4 text-gray-600 select-none border-r border-white/[0.06] mr-4">{i + 1}</div>
          <div className="flex-1 text-gray-300 whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      )
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 z-0 bg-[#06080d] flex flex-col font-mono pt-[72px]"
    >
      {/* IDE Top Bar */}
      <div className="h-10 border-y border-white/[0.06] flex items-center justify-between px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-4 text-[12px] text-gray-400">
          <span className="flex items-center gap-2"><GitBranch size={14} /> main</span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span>CodeEvo Workspace</span>
          {hasBackendFiles && (
            <>
              <span className="w-px h-4 bg-white/[0.1]" />
              <span className="text-emerald-400/60 text-[11px] flex items-center gap-1">
                <CheckCircle2 size={12} /> Agent Code
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {dockerStatus === 'STOPPED' || dockerStatus === 'FAILED' ? (
            <Play onClick={handlePlay} size={14} className="text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" title="Start Sandbox" />
          ) : dockerStatus === 'BUILDING' ? (
            <Loader2 size={14} className="text-emerald-400 animate-spin" title="Starting..." />
          ) : (
            <>
              <Square onClick={handleStop} size={13} className="text-red-400 cursor-pointer hover:text-red-300 transition-colors" fill="currentColor" title="Stop Sandbox" />
              <RefreshCw onClick={handleRestart} size={13} className="text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" title="Restart Sandbox" />
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

      {/* Loading overlay */}
      {isLoadingCode && (
        <div className="flex items-center justify-center gap-2 py-2 bg-[#0a0e1a]/80 border-b border-white/[0.06] text-[11px] text-white/30">
          <Loader2 size={12} className="animate-spin" />
          Loading code files...
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/[0.06] bg-[#0a0e1a]/50 flex flex-col">
          <div className="p-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase flex items-center justify-between">
            Explorer
            <Search size={12} className="cursor-pointer hover:text-gray-300" />
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {Object.keys(fileTree).length > 0 ? (
              Object.values(fileTree).map((item: any, i) => (
                <FileTreeItem key={i} item={item} onSelectFile={setActiveFile} activeFile={activeFile} />
              ))
            ) : (
              !isLoadingCode && (
                <div className="px-4 py-6 text-center text-[12px] text-gray-500">
                  No code files found.
                </div>
              )
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#06080d]">
          {/* Editor Tabs */}
          <div className="flex h-10 bg-[#0a0e1a] border-b border-white/[0.06] overflow-x-auto">
            {activeFile && (
              <div className="flex items-center gap-2 px-4 h-full bg-[#1e293b] border-t-2 border-purple-500 text-[13px] text-white min-w-max cursor-pointer">
                {getFileIcon(activeFile.name)}
                {activeFile.name}
                <X size={14} className="text-gray-400 hover:text-white ml-2" onClick={() => setActiveFile(null)} />
              </div>
            )}
          </div>
          
          {/* Editor Content */}
          <div className="flex-1 overflow-auto p-4 text-[13px] leading-relaxed">
            {activeFile ? (
              <pre className="font-mono">
                {renderCode(activeFile.content)}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4">
                <FileCode2 size={48} className="opacity-20" />
                <p>Select a file to view code</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal / Logs Area */}
      <div className="h-48 border-t border-white/[0.06] bg-[#0a0e1a] flex flex-col">
        <div className="flex gap-4 px-4 h-9 border-b border-white/[0.06] items-center text-[12px] uppercase tracking-wider font-semibold">
          <div 
            onClick={() => setActiveTab('terminal')}
            className={`cursor-pointer ${activeTab === 'terminal' ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Terminal
          </div>
          <div 
            onClick={() => setActiveTab('logs')}
            className={`cursor-pointer ${activeTab === 'logs' ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Logs
          </div>
          <div 
            onClick={() => setActiveTab('problems')}
            className={`cursor-pointer flex items-center gap-1.5 ${activeTab === 'problems' ? 'text-purple-400 border-b-2 border-purple-400 pb-2 translate-y-[1px]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Problems
            <span className="bg-red-500/20 text-red-400 rounded-full px-1.5 py-0.5 text-[10px] leading-none">{problems.length}</span>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto text-[12px] text-gray-400 font-mono space-y-1">
          {activeTab === 'terminal' && (
            <div className="space-y-1 pb-4">
              {dockerLogs.length === 0 && dockerStatus === 'STOPPED' ? (
                <div className="text-gray-500 italic">Click Play to start the Docker sandbox...</div>
              ) : (
                dockerLogs.map((log, index) => (
                  <div key={index} className={`flex items-start gap-2 ${log.includes('ERROR') || log.includes('Exception') || log.includes('failed') ? 'text-red-400' : log.includes('WARN') ? 'text-orange-400' : log.includes('SYSTEM') || log.includes('SUCCESS') ? 'text-emerald-400' : 'text-gray-400'}`}>
                    <span>{log}</span>
                  </div>
                ))
              )}
              {dockerStatus === 'BUILDING' || dockerStatus === 'RUNNING' ? (
                <div className="flex items-start gap-2 mt-2 text-gray-300">
                  <span className="text-emerald-500">➜</span>
                  <span>/workspace</span>
                  <span className="animate-pulse">_</span>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'logs' && (
            <>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[INFO]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>Workspace initialized successfully.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400"><CheckCircle2 size={14} /></span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span className="text-emerald-400">Services synced with architecture graph.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">[SYSTEM]</span>
                <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
                <span>Ready for development. Select a file in the explorer to view the generated source code.</span>
              </div>
            </>
          )}

          {activeTab === 'problems' && (
            <div className="space-y-2">
              {problems.map((problem) => (
                <div key={problem.id} className="flex flex-col gap-1 bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    {problem.type === 'error' ? (
                      <AlertCircle size={14} className="text-red-400" />
                    ) : (
                      <AlertCircle size={14} className="text-orange-400" />
                    )}
                    <span className={problem.type === 'error' ? 'text-red-400 font-semibold' : 'text-orange-400 font-semibold'}>
                      {problem.id}
                    </span>
                    <span className="text-gray-500">in {problem.file}:{problem.line}</span>
                  </div>
                  <div className="text-gray-300 ml-6">{problem.message}</div>
                  <div className="ml-6 mt-1 flex gap-2">
                    <button className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded hover:bg-purple-500/30 transition-colors">
                      Send to AI Agent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Helper: find first file in a tree ───────────────────────────────────────

function findFirstFile(tree: Record<string, any>): any | null {
  for (const node of Object.values(tree)) {
    if (node.type === 'file') return node
    if (node.type === 'folder' && node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}
