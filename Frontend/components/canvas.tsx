'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { projectApi, projectCodeApi } from '@/lib/api'
import { toast } from 'sonner'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { DiagramNode } from './diagram-node'
import { useDiagramStore } from '@/lib/store'
import { Download, Plus, Zap, X, Code2, Network, Server, Database, Layers, Upload, FileJson, Terminal, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { APITester } from './api-tester'
import { CodeViewer } from './code-viewer'
import { CustomEdge } from './custom-edge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const nodeTypes = {
  diagram: DiagramNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

interface CanvasProps {
  selectedNode?: any
  setSelectedNode?: (node: any) => void
  projectId?: string
}

export function Canvas({ selectedNode, setSelectedNode, projectId = 'default' }: CanvasProps) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])

  // 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isLoading, setIsLoading] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveErrorToastRef = useRef<string | number | null>(null)
  const isFirstLoad = useRef(true)

  // ── Load diagram from backend on mount / project change ──────────────────
  useEffect(() => {
    isFirstLoad.current = true
    setSaveStatus('idle')
    setIsLoading(true)

    projectApi.getDiagram(projectId)
      .then((diagram) => {
        if (diagram && diagram.nodes?.length > 0) {
          setNodes(diagram.nodes)
          setEdges(diagram.edges ?? [])
          setIsLoading(false)
          setTimeout(() => { isFirstLoad.current = false }, 300)
        } else {
          setNodes([])
          setEdges([])
          if (projectId === 'default') {
            // Auto-create a real project to replace the "default" placeholder
            projectApi.createProject('New Project', 'Created automatically')
              .then(res => {
                toast.success('Created new project')
                router.replace(`/${res.id}`)
              })
              .catch(createErr => {
                console.error('Failed to auto-create project:', createErr)
                toast.error('Failed to initialize a new project')
                setIsLoading(false)
              })
          } else {
            setIsLoading(false)
            setTimeout(() => { isFirstLoad.current = false }, 300)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load diagram:', err)
        setNodes([])
        setEdges([])
        
        if (projectId === 'default') {
          projectApi.createProject('New Project', 'Created automatically')
            .then(res => {
              toast.success('Created new project')
              router.replace(`/${res.id}`)
            })
            .catch(createErr => {
              console.error('Failed to auto-create project:', createErr)
              toast.error('Failed to initialize a new project')
              setIsLoading(false)
            })
        } else {
          toast.error('Could not load diagram', {
            description: err?.message ?? 'Check your connection and try refreshing.',
            duration: 6000,
          })
          setIsLoading(false)
        }
      })
  }, [projectId, setNodes, setEdges, router])

  // ── Debounced auto-save whenever nodes or edges change ───────────────────
  useEffect(() => {
    // Skip the very first population from the load effect above
    if (isFirstLoad.current) return

    setSaveStatus('saving')
    // Dismiss any lingering save-error toast when the user makes a new change
    if (saveErrorToastRef.current) {
      toast.dismiss(saveErrorToastRef.current)
      saveErrorToastRef.current = null
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      projectApi.saveDiagram(projectId, {
        nodes,
        edges,
        timestamp: new Date().toISOString(),
      })
        .then(() => {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        })
        .catch((err) => {
          console.error('Auto-save failed:', err)
          setSaveStatus('error')
          // Show a persistent toast so the user knows their work isn't saved
          saveErrorToastRef.current = toast.error('Diagram not saved', {
            description: err?.message ?? 'Changes may be lost. Check your connection.',
            duration: Infinity,
            action: {
              label: 'Retry',
              onClick: () => {
                if (saveErrorToastRef.current) {
                  toast.dismiss(saveErrorToastRef.current)
                  saveErrorToastRef.current = null
                }
                setSaveStatus('saving')
                projectApi.saveDiagram(projectId, {
                  nodes,
                  edges,
                  timestamp: new Date().toISOString(),
                })
                  .then(() => {
                    setSaveStatus('saved')
                    toast.success('Diagram saved')
                    setTimeout(() => setSaveStatus('idle'), 2000)
                  })
                  .catch(() => {
                    setSaveStatus('error')
                    toast.error('Retry failed — diagram still not saved.')
                  })
              },
            },
          })
        })
    }, 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, projectId])

  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [showJsonMenu, setShowJsonMenu] = useState(false)
  const [isDownloadingCode, setIsDownloadingCode] = useState(false)
  const { setSelectedNode: storeSetSelectedNode, isChatbotExpanded, viewMode, setViewMode } = useDiagramStore()

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source)
      const targetNode = nodes.find(n => n.id === connection.target)
      
      const isServiceToService = 
        sourceNode?.data?.type === 'service' && 
        targetNode?.data?.type === 'service'
        
      const edgeColor = isServiceToService ? '#6c3bf5' : '#10b981'

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'custom',
            label: 'CONNECTION',
            style: { stroke: edgeColor, strokeDasharray: '4,4', strokeWidth: 1.5 },
          },
          eds
        )
      )
    },
    [setEdges, nodes]
  )

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (setSelectedNode) {
      setSelectedNode({
        id: node.id,
        type: node.data.type,
        name: node.data.name,
        position: node.position,
        language: node.data.language,
        port: node.data.port,
        engine: node.data.engine,
        provider: node.data.provider,
        methods: node.data.methods,
        externalAPIs: node.data.externalAPIs,
        tables: node.data.tables,
        collections: node.data.collections,
        topics: node.data.topics,
        gatewayConfig: node.data.gatewayConfig,
      })
    }
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    if (setSelectedNode) setSelectedNode(null)
  }, [setSelectedNode])

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)

  const requestDeleteNode = useCallback((nodeId: string) => {
    setNodeToDelete(nodeId)
  }, [])

  const confirmDeleteNode = useCallback(() => {
    if (nodeToDelete) {
      setNodes((nds) => nds.filter((n) => n.id !== nodeToDelete))
      setEdges((eds) => eds.filter((e) => e.source !== nodeToDelete && e.target !== nodeToDelete))
      if (selectedNode?.id === nodeToDelete && setSelectedNode) {
        setSelectedNode(null)
      }
      setNodeToDelete(null)
    }
  }, [nodeToDelete, setNodes, setEdges, selectedNode, setSelectedNode])

  const cancelDeleteNode = useCallback(() => {
    setNodeToDelete(null)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        // Prevent deletion if we're focused on an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        requestDeleteNode(selectedNode.id)
      }
    }

    const handleDeleteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      if (customEvent.detail?.id) {
        requestDeleteNode(customEvent.detail.id)
      }
    }

    const handleUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string, data: any }>
      if (customEvent.detail?.id && customEvent.detail?.data) {
        setNodes((nds) => nds.map((n) => {
          if (n.id === customEvent.detail.id) {
            return {
              ...n,
              data: {
                ...n.data,
                ...customEvent.detail.data
              }
            }
          }
          return n
        }))
        
        // Ensure this updater is called outside of the setNodes mapping!
        if (selectedNode?.id === customEvent.detail.id && setSelectedNode) {
          setSelectedNode({
            ...selectedNode,
            ...customEvent.detail.data,
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('delete-diagram-node', handleDeleteEvent)
    window.addEventListener('update-diagram-node', handleUpdateEvent)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('delete-diagram-node', handleDeleteEvent)
      window.removeEventListener('update-diagram-node', handleUpdateEvent)
    }
  }, [selectedNode, requestDeleteNode, setNodes, setSelectedNode])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow') as 'service' | 'database' | 'queue' | 'api'
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) {
        return
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNodeId = String(Math.max(...nodes.map(n => parseInt(n.id) || 0), 0) + 1)
      const nodeConfig = {
        service: {
          name: 'NewService',
          language: 'node.js',
          port: 8000 + nodes.length,
          methods: [{ name: 'handleRequest', description: 'Process incoming request', type: 'mutation' as const }],
          externalAPIs: [],
        },
        api: {
          name: 'APIGateway',
          port: 8080,
          gatewayConfig: {
            platform: 'express-proxy' as const,
            routes: [],
            auth: { enabled: false, type: 'none' as const },
            rateLimit: { enabled: false, requestsPerMinute: 100 },
            cors: { enabled: true, allowedOrigins: ['*'] },
          },
        },
        database: {
          name: 'NewDB',
          engine: 'postgres',
          collections: ['table1', 'table2'],
        },
        queue: {
          name: 'NewQueue',
          provider: 'kafka',
          topics: ['topic.example'],
        },
      }

      const newNode: Node = {
        id: newNodeId,
        type: 'diagram',
        position,
        data: {
          type,
          ...(nodeConfig[type] || nodeConfig.service), // fallback to service if api or something else
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, nodes, setNodes]
  )

  const addNewNode = (type: 'service' | 'database' | 'queue' | 'api') => {
    const newNodeId = String(Math.max(...nodes.map(n => parseInt(n.id) || 0)) + 1)
    const nodeConfig = {
      service: {
        name: 'NewService',
        language: 'node.js',
        port: 8000 + nodes.length,
        methods: [{ name: 'handleRequest', description: 'Process incoming request', type: 'mutation' as const }],
        externalAPIs: [],
      },
      api: {
        name: 'APIGateway',
        port: 8080,
        gatewayConfig: {
          platform: 'express-proxy' as const,
          routes: [],
          auth: { enabled: false, type: 'none' as const },
          rateLimit: { enabled: false, requestsPerMinute: 100 },
          cors: { enabled: true, allowedOrigins: ['*'] },
        },
      },
      database: {
        name: 'NewDB',
        engine: 'postgres',
        tables: [
          { name: 'table1', columns: [{ name: 'id', type: 'uuid' }] },
          { name: 'table2', columns: [{ name: 'id', type: 'uuid' }] }
        ] as any[],
      },
      queue: {
        name: 'NewQueue',
        provider: 'kafka',
        topics: ['topic.example'],
      },
    }

    const newNode: Node = {
      id: newNodeId,
      type: 'diagram',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        type,
        ...nodeConfig[type],
      },
    }

    setNodes([...nodes, newNode])
    setShowNodeMenu(false)
  }

  const handleDownloadCode = async () => {
    if (!projectId || projectId === 'default') {
      toast.error('Project not initialized yet.')
      return
    }

    setIsDownloadingCode(true)
    try {
      await projectCodeApi.downloadZip(projectId)
      toast.success('Code downloaded successfully.')
    } catch (err: any) {
      if (err?.message?.includes('No code files')) {
        toast.info('No code generated yet', {
          description: 'Code will be generated when the AI agent processes your architecture.',
        })
      } else {
        toast.error('Failed to download code', {
          description: err?.message || 'Could not download the project code.',
        })
      }
    } finally {
      setIsDownloadingCode(false)
    }
  }

  const exportDiagram = () => {
    const diagram = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
    }
    const dataStr = JSON.stringify(diagram, null, 2)
    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr)
    )
    element.setAttribute('download', `diagram-${Date.now()}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const importDiagram = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string
          const parsed = JSON.parse(content)
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes)
            setEdges(parsed.edges)
            toast.success('Diagram imported', {
              description: `${parsed.nodes.length} nodes, ${parsed.edges.length} edges loaded.`,
            })
          } else {
            toast.error('Invalid diagram file', {
              description: 'The JSON must contain both "nodes" and "edges" arrays.',
            })
          }
        } catch (err) {
          console.error('Failed to read file', err)
          toast.error('Could not parse file', {
            description: 'Make sure you selected a valid JSON diagram file.',
          })
        }
      }
      reader.onerror = () => {
        toast.error('File read error', { description: 'Could not read the selected file.' })
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="relative w-full h-full bg-[#0a0e1a]" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>

      {/* Loading overlay — shown while diagram fetches from backend */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="canvas-loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 bg-[#0a0e1a] flex flex-col items-center justify-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
              <div className="absolute w-6 h-6 rounded-full border-2 border-pink-500/20 border-b-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
            </div>
            <p className="text-[12px] text-white/30 tracking-widest uppercase font-mono">Loading diagram…</p>
          </motion.div>
        )}
      </AnimatePresence>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onInit={(instance) => {
          setReactFlowInstance(instance)
          setTimeout(() => {
            // Wait for the AgentChat sidebar animation to finish (takes ~600ms) before fitting
            // fitView with larger padding automatically zooms out and guarantees it stays perfectly centered
            instance.fitView({ padding: 0.8, duration: 500 });
          }, 800);
        }}
      >
        <Background color="#1a1f35" gap={20} size={1} />
        <Controls
          style={{
            background: '#0d1220',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '4px',
          }}
        />
        <MiniMap
          style={{
            background: '#0d1220',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            bottom: isChatbotExpanded ? '16px' : '76px',
            right: '16px',
            margin: 0,
            transition: 'all 0.3s ease-in-out',
          }}
          position="bottom-right"
          maskColor="rgba(108, 59, 245, 0.08)"
          nodeColor="#1e2440"
        />
      </ReactFlow>

      {/* Persistent background — covers graph during code↔test transitions */}
      <AnimatePresence>
        {viewMode !== 'graph' && (
          <motion.div
            key="overlay-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#06080d]"
          />
        )}
      </AnimatePresence>

      {/* Code / Test View Overlay */}
      <AnimatePresence mode="wait">
        {viewMode === 'code' && (
          <CodeViewer key="code-view" nodes={nodes} edges={edges} projectId={projectId} />
        )}
        {viewMode === 'test' && (
          <APITester key="test-view" nodes={nodes} />
        )}
      </AnimatePresence>

      {/* Top Toolbar - 3 column layout: Add Node | center controls | Generate Code */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between"
      >
        {/* Left - Add Node Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowNodeMenu(!showNodeMenu)}
            disabled={viewMode !== 'graph'}
            className="px-4 py-2 bg-[#6c3bf5] hover:bg-[#5b2cd6] text-white rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(108,59,245,0.3)] hover:shadow-[0_0_25px_rgba(108,59,245,0.5)] disabled:hover:shadow-[0_0_15px_rgba(108,59,245,0.3)] border border-white/10"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Node
          </button>

          <AnimatePresence>
            {showNodeMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute top-full left-0 mt-3 bg-[#0f1423]/95 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-w-[200px] z-50 p-1.5"
              >
                {[
                  { type: 'service' as const, icon: Server, label: 'Service Component', color: 'text-purple-400', bgHover: 'hover:bg-purple-500/10' },
                  { type: 'database' as const, icon: Database, label: 'Database System', color: 'text-amber-400', bgHover: 'hover:bg-amber-500/10' },
                  { type: 'queue' as const, icon: Layers, label: 'Message Queue', color: 'text-pink-400', bgHover: 'hover:bg-pink-500/10' },
                  { type: 'api' as const, icon: Network, label: 'API Gateway', color: 'text-emerald-400', bgHover: 'hover:bg-emerald-500/10' },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => addNewNode(item.type)}
                    className={`w-full px-3 py-2.5 text-left text-white/80 hover:text-white text-[13px] font-medium rounded-lg flex items-center gap-3 transition-all duration-200 ${item.bgHover}`}
                  >
                    <div className={`p-1.5 rounded-md bg-white/[0.03] shadow-inner border border-white/[0.05] ${item.color}`}>
                      <item.icon size={16} strokeWidth={2} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center - View Toggle + JSON + Download Code */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-[#0d1220]/90 backdrop-blur-sm p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${viewMode === 'graph' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
            >
              <Network size={14} />
              Graph
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${viewMode === 'code' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
            >
              <Code2 size={14} />
              Code
            </button>
            <button
              onClick={() => setViewMode('test')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${viewMode === 'test' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
            >
              <Zap size={14} />
              Test
            </button>
          </div>

          {/* JSON Data */}
          <div className="relative">
            <button
              onClick={() => setShowJsonMenu(!showJsonMenu)}
              className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
            >
              <FileJson size={14} />
              JSON Data
            </button>
            <AnimatePresence>
              {showJsonMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  className="absolute top-full right-0 mt-3 bg-[#0f1423]/95 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden min-w-[200px] z-50 p-1.5"
                >
                  <button
                    onClick={() => { importDiagram(); setShowJsonMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-white/80 hover:text-white text-[13px] font-medium rounded-lg flex items-center gap-3 transition-all duration-200 hover:bg-emerald-500/10"
                  >
                    <div className="p-1.5 rounded-md bg-white/[0.03] shadow-inner border border-white/[0.05] text-emerald-400">
                      <Upload size={16} strokeWidth={2} />
                    </div>
                    Import JSON
                  </button>
                  <button
                    onClick={() => { exportDiagram(); setShowJsonMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-white/80 hover:text-white text-[13px] font-medium rounded-lg flex items-center gap-3 transition-all duration-200 hover:bg-blue-500/10"
                  >
                    <div className="p-1.5 rounded-md bg-white/[0.03] shadow-inner border border-white/[0.05] text-blue-400">
                      <Download size={16} strokeWidth={2} />
                    </div>
                    Export JSON
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Download Code */}
          <button
            onClick={handleDownloadCode}
            disabled={isDownloadingCode}
            className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloadingCode ? (
              <svg className="animate-spin w-3.5 h-3.5 text-white/60" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <Code2 size={14} />
            )}
            {isDownloadingCode ? 'Downloading...' : 'Download Code'}
          </button>
        </div>

        {/* Right - Generate Code Button */}
        <div className="shrink-0">
          <button
            onClick={() => setViewMode('code')}
            disabled={viewMode !== 'graph'}
            className="px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(199,76,240,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <Play size={15} className="fill-current" />
            Generate Code
          </button>
        </div>
      </motion.div>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] text-white/20 bg-[#0d1220]/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/[0.06] z-10">
        <span className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          {nodes.length} Nodes
        </span>
        <span className="w-px h-3 bg-white/[0.06]" />
        <span>{edges.length} Edges</span>
        <span className="w-px h-3 bg-white/[0.06]" />
        <span className="font-mono text-purple-400/40">v1.2.0</span>
        <span className="w-px h-3 bg-white/[0.06]" />
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-white/30">
            <svg className="animate-spin w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-emerald-400/60">Saved ✓</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-400/70">Save failed</span>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(isOpen) => !isOpen && cancelDeleteNode()}>
        <AlertDialogContent className="bg-[#0d1220] border border-white/[0.08] text-white/90">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this node? This action cannot be undone and will remove all connected edges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={cancelDeleteNode}
              className="bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.08] hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteNode}
              className="bg-red-500/80 hover:bg-red-500 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
