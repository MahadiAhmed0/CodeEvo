'use client'

import { useCallback, useState } from 'react'
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
import { Download, Plus, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { APITestingModal } from './api-testing-modal'

const nodeTypes = {
  diagram: DiagramNode,
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
    position: { x: 400, y: 100 },
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
    position: { x: 700, y: 100 },
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
    position: { x: 100, y: 300 },
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
    position: { x: 400, y: 300 },
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
    position: { x: 700, y: 300 },
    type: 'diagram',
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e1-4',
    source: '1',
    target: '4',
    label: 'db-connection',
    style: { stroke: '#f59e0b', strokeDasharray: '5,5', strokeWidth: 2.5 },
    labelStyle: { 
      fill: '#f59e0b',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'var(--font-sometype-mono), monospace',
    },
    labelBgStyle: { fill: 'transparent' },
  },
  {
    id: 'e2-5',
    source: '2',
    target: '5',
    label: 'db-connection',
    style: { stroke: '#f59e0b', strokeDasharray: '5,5', strokeWidth: 2.5 },
    labelStyle: { 
      fill: '#f59e0b',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'var(--font-sometype-mono), monospace',
    },
    labelBgStyle: { fill: 'transparent' },
  },
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    label: 'REST',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2.5 },
    labelStyle: { 
      fill: '#10b981',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'var(--font-sometype-mono), monospace',
    },
    labelBgStyle: { fill: 'transparent' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    label: 'REST',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2.5 },
    labelStyle: { 
      fill: '#10b981',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'var(--font-sometype-mono), monospace',
    },
    labelBgStyle: { fill: 'transparent' },
  },
  {
    id: 'e2-6',
    source: '2',
    target: '6',
    label: 'events',
    style: { stroke: '#cb6ce6', strokeDasharray: '5,5', strokeWidth: 2.5 },
    labelStyle: { 
      fill: '#cb6ce6',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'var(--font-sometype-mono), monospace',
    },
    labelBgStyle: { fill: 'transparent' },
  },
]

interface CanvasProps {
  selectedNode?: any
  setSelectedNode?: (node: any) => void
}

export function Canvas({ selectedNode, setSelectedNode }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [showAPIModal, setShowAPIModal] = useState(false)
  const { setSelectedNode: storeSetSelectedNode } = useDiagramStore()

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: { stroke: '#004aad' },
          },
          eds
        )
      )
    },
    [setEdges]
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

  return (
    <div className="relative w-full h-full bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls
          style={{
            background: 'white',
            border: '2px solid #004aad',
            borderRadius: '8px',
          }}
        />
        <MiniMap
          style={{
            background: 'white',
            border: '2px solid #004aad',
            borderRadius: '8px',
          }}
          maskColor="rgba(0, 74, 173, 0.1)"
        />
      </ReactFlow>

      {/* Top Left - Add Node Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-4 left-4 z-10"
      >
        <div className="relative">
          <button
            onClick={() => setShowNodeMenu(!showNodeMenu)}
            className="px-4 py-2 bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            Add Node
          </button>

          {showNodeMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border-2 border-[#004aad] overflow-hidden"
            >
              <button
                onClick={() => addNewNode('service')}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 text-[#0b1c2c] font-semibold border-b border-gray-200 flex items-center gap-2"
              >
                <span>⚙️</span>
                Service
              </button>
              <button
                onClick={() => addNewNode('database')}
                className="w-full px-4 py-2 text-left hover:bg-orange-50 text-[#0b1c2c] font-semibold border-b border-gray-200 flex items-center gap-2"
              >
                <span>🗄️</span>
                Database
              </button>
              <button
                onClick={() => addNewNode('queue')}
                className="w-full px-4 py-2 text-left hover:bg-purple-50 text-[#0b1c2c] font-semibold flex items-center gap-2"
              >
                <span>📬</span>
                Queue
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Top Right Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-4 right-4 flex gap-2 z-10"
      >
        <button
          onClick={() => setShowAPIModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Zap size={16} />
          API Test
        </button>
        <button
          onClick={exportDiagram}
          className="px-4 py-2 bg-white border-2 border-[#004aad] text-[#004aad] rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Download size={16} />
          Export
        </button>
      </motion.div>

      {/* Status Bar */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
        <p>
          Nodes: {nodes.length} | Edges: {edges.length} | Branch: main | v1.2.0
        </p>
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
