'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
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
import { Download, Plus, Zap, X, Code2, Network } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { APITestingModal } from './api-testing-modal'
import { CodeViewer } from './code-viewer'
import { CustomEdge } from './custom-edge'

const nodeTypes = {
  diagram: DiagramNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

const initialNodes: Node[] = [
  {
    id: '1',
    data: {
      type: 'service',
      name: 'UserService',
      language: 'spring-boot',
      port: 8080,
      endpoints: ['/users', '/users/{id}', '/users/{id}/profile'],
    },
    position: { x: 100, y: 100 },
    type: 'diagram',
  },
  {
    id: '2',
    data: {
      type: 'service',
      name: 'OrderService',
      language: 'spring-boot',
      port: 8081,
      endpoints: ['/orders', '/orders/{id}', '/orders/{id}/status'],
    },
    position: { x: 450, y: 100 },
    type: 'diagram',
  },
  {
    id: '3',
    data: {
      type: 'service',
      name: 'PaymentService',
      language: 'go',
      port: 9000,
      endpoints: ['/payments', '/payments/{id}/verify'],
    },
    position: { x: 800, y: 100 },
    type: 'diagram',
  },
  {
    id: '4',
    data: {
      type: 'database',
      name: 'UserDB',
      engine: 'postgres',
      collections: ['users', 'profiles', 'preferences'],
    },
    position: { x: 100, y: 350 },
    type: 'diagram',
  },
  {
    id: '5',
    data: {
      type: 'database',
      name: 'OrderDB',
      engine: 'postgres',
      collections: ['orders', 'order_items', 'shipments'],
    },
    position: { x: 450, y: 350 },
    type: 'diagram',
  },
  {
    id: '6',
    data: {
      type: 'queue',
      name: 'EventBus',
      provider: 'kafka',
      topics: ['order.created', 'payment.processed', 'user.registered'],
    },
    position: { x: 800, y: 350 },
    type: 'diagram',
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e1-4',
    source: '1',
    target: '4',
    label: 'DB-CONN',
    type: 'custom',
    style: { stroke: '#f59e0b', strokeDasharray: '4,4', strokeWidth: 1.5 },
  },
  {
    id: 'e2-5',
    source: '2',
    target: '5',
    label: 'DB-CONN',
    type: 'custom',
    style: { stroke: '#f59e0b', strokeDasharray: '4,4', strokeWidth: 1.5 },
  },
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    label: 'REST API',
    type: 'custom',
    style: { stroke: '#10b981', strokeDasharray: '4,4', strokeWidth: 1.5 },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    label: 'REST API',
    type: 'custom',
    style: { stroke: '#10b981', strokeDasharray: '4,4', strokeWidth: 1.5 },
  },
  {
    id: 'e2-6',
    source: '2',
    target: '6',
    label: 'EVENTS',
    type: 'custom',
    style: { stroke: '#c74cf0', strokeDasharray: '4,4', strokeWidth: 1.5 },
  },
]

interface CanvasProps {
  selectedNode?: any
  setSelectedNode?: (node: any) => void
  projectId?: string
}

export function Canvas({ selectedNode, setSelectedNode, projectId = 'default' }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // Load saved state on mount or project change
  useEffect(() => {
    const savedNodes = localStorage.getItem(`diagram-nodes-${projectId}`)
    const savedEdges = localStorage.getItem(`diagram-edges-${projectId}`)
    
    if (savedNodes) {
      try {
        setNodes(JSON.parse(savedNodes))
      } catch (e) {
        console.error('Failed to parse nodes:', e)
      }
    } else {
      setNodes(initialNodes)
    }
    
    if (savedEdges) {
      try {
        setEdges(JSON.parse(savedEdges))
      } catch (e) {
        console.error('Failed to parse edges:', e)
      }
    } else {
      setEdges(initialEdges)
    }
  }, [projectId, setNodes, setEdges])

  // Save state on change
  useEffect(() => {
    if (nodes.length > 0) {
      localStorage.setItem(`diagram-nodes-${projectId}`, JSON.stringify(nodes))
    }
  }, [nodes, projectId])

  useEffect(() => {
    if (edges.length > 0) {
      localStorage.setItem(`diagram-edges-${projectId}`, JSON.stringify(edges))
    }
  }, [edges, projectId])

  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [showAPIModal, setShowAPIModal] = useState(false)
  const [viewMode, setViewMode] = useState<'graph' | 'code'>('graph')
  const { setSelectedNode: storeSetSelectedNode, isChatbotExpanded } = useDiagramStore()

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'custom',
            label: 'CONNECTION',
            style: { stroke: '#6c3bf5', strokeDasharray: '4,4', strokeWidth: 1.5 },
          },
          eds
        )
      )
    },
    [setEdges]
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
        endpoints: node.data.endpoints,
        collections: node.data.collections,
        topics: node.data.topics,
      })
    }
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    if (setSelectedNode) setSelectedNode(null)
  }, [setSelectedNode])

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

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
          endpoints: ['/api/endpoint'],
        },
        api: {
          name: 'APIGateway',
          language: 'node.js',
          port: 8080,
          endpoints: ['/api/*'],
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

  const addNewNode = (type: 'service' | 'database' | 'queue') => {
    const newNodeId = String(Math.max(...nodes.map(n => parseInt(n.id) || 0)) + 1)
    const nodeConfig = {
      service: {
        name: 'NewService',
        language: 'node.js',
        port: 8000 + nodes.length,
        endpoints: ['/api/endpoint'],
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
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        type,
        ...nodeConfig[type],
      },
    }

    setNodes([...nodes, newNode])
    setShowNodeMenu(false)
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
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const parsed = JSON.parse(content)
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes)
            setEdges(parsed.edges)
          } else {
            console.error('Invalid format')
          }
        } catch (err) {
          console.error('Failed to read file', err)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="relative w-full h-full bg-[#0a0e1a]" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
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

      {/* Code View Overlay */}
      <AnimatePresence>
        {viewMode === 'code' && (
          <CodeViewer nodes={nodes} edges={edges} />
        )}
      </AnimatePresence>

      {/* Top Left - Add Node Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 left-4 z-10"
      >
        <div className="relative">
          <button
            onClick={() => setShowNodeMenu(!showNodeMenu)}
            disabled={viewMode === 'code'}
            className="px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            Add Node
          </button>

          <AnimatePresence>
            {showNodeMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute top-full left-0 mt-2 bg-[#0d1220]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/[0.08] overflow-hidden min-w-[180px]"
              >
                {[
                  { type: 'service' as const, icon: '⚙️', label: 'Service', color: 'hover:bg-purple-500/10' },
                  { type: 'database' as const, icon: '🗄️', label: 'Database', color: 'hover:bg-amber-500/10' },
                  { type: 'queue' as const, icon: '📬', label: 'Queue', color: 'hover:bg-pink-500/10' },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => addNewNode(item.type)}
                    className={`w-full px-4 py-2.5 text-left text-white/70 hover:text-white text-[13px] font-medium border-b border-white/[0.04] last:border-0 flex items-center gap-2.5 transition-all duration-200 ${item.color}`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Top Right Controls */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 right-4 flex gap-4 z-10"
      >
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
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAPIModal(true)}
            className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
          >
            <Zap size={14} className="text-amber-400/70" />
            API Test
          </button>
          <button
            onClick={importDiagram}
            className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
          >
            <Plus size={14} />
            Import JSON
          </button>
          <button
            onClick={exportDiagram}
            className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
          >
            <Download size={14} />
            Export JSON
          </button>
          <button
            className="px-3.5 py-2 bg-[#0d1220]/90 backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-[13px] font-medium flex items-center gap-2 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
          >
            <Code2 size={14} />
            Download Code
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
      </div>

      {/* API Testing Modal */}
      <APITestingModal 
        isOpen={showAPIModal} 
        onClose={() => setShowAPIModal(false)}
        selectedNode={selectedNode || nodes[0]}
      />
    </div>
  )
}
