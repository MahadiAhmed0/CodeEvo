'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useDiagramStore, GatewayConfig, ServiceMethod, ExternalAPI } from '@/lib/store'
import { Server, Network, Database, Layers, Shield, Gauge, Globe, ExternalLink } from 'lucide-react'

export interface EndpointConfig {
  path: string
  method: string
  description?: string
  body?: string
}

interface DiagramNodeProps extends NodeProps {
  data: {
    type: 'service' | 'api' | 'database' | 'queue'
    name: string
    port?: number
    engine?: string
    provider?: string
    endpoints?: EndpointConfig[]
    methods?: ServiceMethod[]
    externalAPIs?: ExternalAPI[]
    tables?: string[]
    collections?: string[]
    topics?: string[]
    gatewayConfig?: GatewayConfig
  }
}

export function DiagramNode({ data, selected, id }: DiagramNodeProps) {
  const { setSelectedNode, selectedNode } = useDiagramStore()

  const typeConfig = {
    service: {
      color: '#6c3bf5',
      colorEnd: '#8b5cf6',
      label: 'SERVICE',
      icon: Server,
      glow: 'rgba(108, 59, 245, 0.15)',
      borderColor: 'rgba(108, 59, 245, 0.25)',
    },
    api: {
      color: '#10b981',
      colorEnd: '#34d399',
      label: 'MAIN GATEWAY',
      icon: Network,
      glow: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    database: {
      color: '#f59e0b',
      colorEnd: '#fbbf24',
      label: 'DATABASE',
      icon: Database,
      glow: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    queue: {
      color: '#c74cf0',
      colorEnd: '#e879f9',
      label: 'QUEUE',
      icon: Layers,
      glow: 'rgba(199, 76, 240, 0.15)',
      borderColor: 'rgba(199, 76, 240, 0.25)',
    },
  }

  const config = typeConfig[data.type]
  const isSelected = selectedNode?.id === id
  const IconComp = config.icon

  return (
    <div
      className="w-48 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer"
      style={{
        backgroundColor: '#111827',
        border: `1.5px solid ${isSelected ? config.color : config.borderColor}`,
        boxShadow: isSelected
          ? `0 0 20px ${config.glow}, 0 8px 24px rgba(0,0,0,0.4)`
          : `0 4px 16px rgba(0,0,0,0.3)`,
      }}
      onClick={() =>
        setSelectedNode({
          id,
          type: data.type,
          name: data.name,
          position: { x: 0, y: 0 },
          port: data.port,
          engine: data.engine,
          provider: data.provider,
          endpoints: data.endpoints,
          methods: data.methods,
          externalAPIs: data.externalAPIs,
          tables: data.tables,
          collections: data.collections,
          topics: data.topics,
          gatewayConfig: data.gatewayConfig,
        })
      }
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          background: `linear-gradient(135deg, ${config.color}, ${config.colorEnd})`,
        }}
      >
        <IconComp className="w-3 h-3 text-white/80" />
        <span className="text-[9px] font-bold text-white/90 uppercase tracking-[0.15em]">
          {config.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2">
        <p className="font-bold text-sm text-white/90 leading-tight">
          {data.name}
        </p>

        {data.type === 'service' && (
          <div className="space-y-1 text-[10px]">
            {data.methods && data.methods.length > 0 && (
              <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                {data.methods.slice(0, 3).map((m, i) => {
                  const badge = m.type === 'query' ? 'Q' : m.type === 'mutation' ? 'M' : 'H'
                  const badgeColor = m.type === 'query' ? 'text-blue-400 bg-blue-500/15' : m.type === 'mutation' ? 'text-amber-400 bg-amber-500/15' : 'text-purple-400 bg-purple-500/15'
                  return (
                    <div key={i} className="flex gap-1.5 items-center bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                      <span className={`text-[7px] font-bold px-1 rounded ${badgeColor}`}>{badge}</span>
                      <p className="text-white/50 text-[9px] truncate">{m.name}()</p>
                    </div>
                  )
                })}
                {data.methods.length > 3 && (
                  <p className="text-white/15 text-[9px]">+{data.methods.length - 3} more</p>
                )}
              </div>
            )}
            {data.externalAPIs && data.externalAPIs.length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                <span className="flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ExternalLink className="w-2 h-2" />{data.externalAPIs.length} ext API{data.externalAPIs.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {data.type === 'api' && data.gatewayConfig && (
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between text-white/35">
              <span className="capitalize">{data.gatewayConfig.language.replace('-', ' ')}</span>
              <span className="font-mono text-white/25">:{data.port || 8080}</span>
            </div>
            {data.gatewayConfig.routes.length > 0 ? (
              <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                {data.gatewayConfig.routes.slice(0, 2).map((route, i) => (
                  <div key={i} className="flex gap-1.5 items-center bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                    <span className="text-[7px] font-bold px-1 rounded bg-emerald-500/15 text-emerald-400 shrink-0">→</span>
                    <p className="text-white/50 font-mono text-[9px] truncate">{route.pathPrefix}</p>
                  </div>
                ))}
                {data.gatewayConfig.routes.length > 2 && (
                  <p className="text-white/15 text-[9px]">+{data.gatewayConfig.routes.length - 2} more routes</p>
                )}
              </div>
            ) : (
              <p className="text-white/15 text-[9px] pt-1 border-t border-white/[0.06]">No routes configured</p>
            )}
            <div className="flex gap-1 pt-1">
              {data.gatewayConfig.auth.enabled && (
                <span className="flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="w-2 h-2" />Auth
                </span>
              )}
              {data.gatewayConfig.rateLimit.enabled && (
                <span className="flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Gauge className="w-2 h-2" />Rate
                </span>
              )}
              {data.gatewayConfig.cors.enabled && (
                <span className="flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Globe className="w-2 h-2" />CORS
                </span>
              )}
            </div>
          </div>
        )}

        {data.type === 'database' && (
          <div className="space-y-1 text-[10px]">
            <p className="text-white/35">{data.engine || 'PostgreSQL'}</p>
            {data.tables && (data.engine === 'postgres' || data.engine === 'mysql') && (
              <div className="pt-1.5 border-t border-white/[0.06] space-y-0.5">
                {data.tables.slice(0, 2).map((t: any, i: number) => (
                  <p key={`table-${i}`} className="text-amber-400/40 font-mono text-[9px] truncate">{(typeof t === 'string') ? t : t.name}</p>
                ))}
                {data.tables.length > 2 && (
                  <p className="text-white/15 text-[9px]">+{data.tables.length - 2} more</p>
                )}
              </div>
            )}
            {data.collections && data.engine === 'mongodb' && (
              <div className="pt-1.5 border-t border-white/[0.06] space-y-0.5">
                {data.collections.slice(0, 2).map((c: any, i: number) => (
                  <p key={`coll-${i}`} className="text-amber-400/40 font-mono text-[9px] truncate">{(typeof c === 'string') ? c : c.name}</p>
                ))}
                {data.collections.length > 2 && (
                  <p className="text-white/15 text-[9px]">+{data.collections.length - 2} more</p>
                )}
              </div>
            )}
          </div>
        )}

        {data.type === 'queue' && (
          <div className="space-y-1 text-[10px]">
            <p className="text-white/35">{data.provider || 'Kafka'}</p>
            {data.topics && (
              <div className="pt-1.5 border-t border-white/[0.06] space-y-0.5">
                {data.topics.slice(0, 2).map((t, i) => (
                  <p key={i} className="text-purple-400/40 font-mono text-[9px] truncate">{t}</p>
                ))}
                {data.topics.length > 2 && (
                  <p className="text-white/15 text-[9px]">+{data.topics.length - 2} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection Ports */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: config.color,
          border: '2px solid #111827',
          width: '9px',
          height: '9px',
          boxShadow: `0 0 6px ${config.glow}`,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: config.color,
          border: '2px solid #111827',
          width: '9px',
          height: '9px',
          boxShadow: `0 0 6px ${config.glow}`,
        }}
      />
    </div>
  )
}
