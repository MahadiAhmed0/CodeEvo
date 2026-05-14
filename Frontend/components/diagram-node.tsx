'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useDiagramStore } from '@/lib/store'
import { Trash2, Copy, Server, Network, Database, Layers } from 'lucide-react'

interface DiagramNodeProps extends NodeProps {
  data: {
    type: 'service' | 'api' | 'database' | 'queue'
    name: string
    language?: string
    port?: number
    engine?: string
    provider?: string
    endpoints?: string[]
    collections?: string[]
    topics?: string[]
  }
}

export function DiagramNode({ data, selected, id }: DiagramNodeProps) {
  const { removeNode, setSelectedNode, selectedNode } = useDiagramStore()

  const typeConfig = {
    service: {
      color: '#004aad',
      label: 'SERVICE',
      icon: Server,
    },
    api: {
      color: '#10b981',
      label: 'API',
      icon: Network,
    },
    database: {
      color: '#f59e0b',
      label: 'DATABASE',
      icon: Database,
    },
    queue: {
      color: '#cb6ce6',
      label: 'QUEUE',
      icon: Layers,
    },
  }

  const config = typeConfig[data.type]
  const isSelected = selectedNode?.id === id

  return (
    <div
      className={`w-56 rounded-xl overflow-hidden shadow-lg transition-all ${
        isSelected ? 'ring-2 ring-offset-2' : 'hover:shadow-2xl'
      }`}
      style={{
        backgroundColor: '#f8f9fb',
        borderWidth: '2px',
        borderColor: config.color,
        ringColor: config.color,
      }}
      onClick={() =>
        setSelectedNode({
          id,
          type: data.type,
          name: data.name,
          position: { x: 0, y: 0 },
          language: data.language,
          port: data.port,
          engine: data.engine,
          provider: data.provider,
          endpoints: data.endpoints,
          collections: data.collections,
          topics: data.topics,
        })
      }
    >
      {/* Header with Solid Color match */}
      <div
        className="px-4 py-2 text-white text-xs font-bold tracking-wide flex items-center justify-between"
        style={{
          backgroundColor: config.color,
          opacity: 0.9,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white opacity-80" />
          <span className="font-sans uppercase tracker-widest">{config.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3">
        {/* Node Name */}
        <div>
          <p className="font-bold text-lg text-[#0b1c2c] leading-tight">
            {data.name}
          </p>
        </div>

        {/* Details based on type */}
        {data.type === 'service' && (
          <div className="space-y-2 text-xs">
            <div className="flex gap-2 text-gray-600">
              <span className="font-semibold min-w-fit">Language:</span>
              <span>{data.language || 'N/A'}</span>
            </div>
            <div className="flex gap-2 text-gray-600">
              <span className="font-semibold min-w-fit">Port:</span>
              <span>:{data.port || 8000}</span>
            </div>
            {data.endpoints && data.endpoints.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-700 font-semibold mb-1">Endpoints:</p>
                {data.endpoints.map((endpoint, i) => (
                  <p key={i} className="text-gray-600 text-xs">
                    {endpoint}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {data.type === 'database' && (
          <div className="space-y-2 text-xs">
            <div className="flex gap-2 text-gray-600">
              <span className="font-semibold min-w-fit">Engine:</span>
              <span>{data.engine || 'PostgreSQL'}</span>
            </div>
            {data.collections && data.collections.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-700 font-semibold mb-1">Collections:</p>
                {data.collections.map((coll, i) => (
                  <p key={i} className="text-gray-600 text-xs">
                    {coll}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {data.type === 'queue' && (
          <div className="space-y-2 text-xs">
            <div className="flex gap-2 text-gray-600">
              <span className="font-semibold min-w-fit">Provider:</span>
              <span>{data.provider || 'Kafka'}</span>
            </div>
            {data.topics && data.topics.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-700 font-semibold mb-1">Topics:</p>
                {data.topics.map((topic, i) => (
                  <p key={i} className="text-gray-600 text-xs">
                    {topic}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Button */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => removeNode(id)}
          className="flex-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1 font-semibold"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {/* Connection Ports */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
