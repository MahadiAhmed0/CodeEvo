import React, { useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow
} from 'reactflow'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { X, MousePointerClick } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const EDGE_LABELS = ['REST API', 'DB-CONN', 'EVENTS', 'CONNECTION', 'GRPC', 'GRAPHQL']

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const [isHovered, setIsHovered] = useState(false)

  const handleLabelChange = (newLabel: string) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            label: newLabel,
            labelStyle: {
              ...(edge.labelStyle as any),
              fill: newLabel === 'DB-CONN' ? '#fcd34d' : newLabel === 'EVENTS' ? '#f0abfc' : '#6ee7b7',
            },
            style: {
              ...edge.style,
              stroke: newLabel === 'DB-CONN' ? '#f59e0b' : newLabel === 'EVENTS' ? '#c74cf0' : '#10b981',
            }
          }
        }
        return edge
      })
    )
  }

  const handleRemoveEdge = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Control + Left click
    if (e.ctrlKey && e.button === 0) {
      setEdges((eds) => eds.filter((edge) => edge.id !== id))
    } else {
      // You can implement standard removal here as well if you want, but requirement says Ctrl + Left Key
    }
  }

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 2.5 : 1.5,
          cursor: 'pointer'
        }} 
      />

      {/* Invisible thicker path for easier hovering/clicking over the line */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleRemoveEdge}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-2 group nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleRemoveEdge}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 shadow-lg cursor-pointer outline-none relative",
                  selected || isHovered
                    ? "bg-[#0d1220] ring-1 ring-white/20 text-white shadow-purple-500/10"
                    : "bg-[#0a0e1a]/95 text-white/80 border border-transparent"
                )}
                style={{
                  color: (style as any)?.stroke || '#c4b5fd',
                }}
                onClick={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault()
                    e.stopPropagation()
                    // Re-trigger the remove edge logic intentionally on the button
                    setEdges((eds) => eds.filter((edge) => edge.id !== id))
                  }
                }}
              >
                {label || 'CONNECTION'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={5}
              className="bg-[#0d1220]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-1 z-50 rounded-xl w-32"
            >
              {EDGE_LABELS.map((lbl) => (
                <DropdownMenuItem
                  key={lbl}
                  onClick={() => handleLabelChange(lbl)}
                  className="px-2 py-1.5 text-[11px] text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors rounded-lg cursor-pointer outline-none focus:bg-white/[0.04]"
                >
                  {lbl}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <AnimatePresence>
            {(selected || isHovered) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full ml-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#eb5757]/10 text-red-400 border border-red-500/20 whitespace-nowrap shadow-lg backdrop-blur-md pointer-events-none"
              >
                <MousePointerClick className="w-3 h-3" />
                <span className="text-[9px] font-medium leading-none">Ctrl + Click to remove</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
