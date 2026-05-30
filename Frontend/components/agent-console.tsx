'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useDiagramStore } from '@/lib/store'
import {
  ChevronUp,
  Play,
  Square,
  RotateCcw,
  Zap,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react'

const agentStates = {
  IDLE: { label: 'Idle', color: 'bg-gray-400', dot: 'bg-gray-400' },
  PLANNING: { label: 'Planning', color: 'bg-blue-500', dot: 'bg-blue-500' },
  EXECUTING: { label: 'Executing', color: 'bg-amber-500', dot: 'bg-amber-500' },
  VERIFYING: { label: 'Verifying', color: 'bg-orange-500', dot: 'bg-orange-500' },
  COMMITTED: { label: 'Committed', color: 'bg-green-500', dot: 'bg-green-500' },
  ROLLBACK: { label: 'Rollback', color: 'bg-red-500', dot: 'bg-red-500' },
}

const mockLogs = [
  { level: 'info', message: 'Agent initialized for project: My First System' },
  { level: 'info', message: 'Received diff object: 1 added node, 2 modified' },
  { level: 'planning', message: 'PLANNING: Generating execution plan...' },
  { level: 'success', message: 'Plan generated: create_service → create_api → connect_db → commit' },
  { level: 'executing', message: 'EXECUTING: Tool 1/4 - create_service(PaymentService)' },
  { level: 'info', message: '  Created /services/PaymentService directory' },
  { level: 'info', message: '  Generated build configuration' },
  { level: 'success', message: '✓ create_service completed' },
  { level: 'executing', message: 'EXECUTING: Tool 2/4 - create_api(PaymentService, POST /payments)' },
  { level: 'success', message: '✓ create_api completed' },
  { level: 'success', message: 'VERIFYING: Code compiled successfully' },
  { level: 'success', message: 'COMMITTED: Generated commit a1b2c3d4' },
  { level: 'success', message: 'Agent run completed successfully in 2.4s' },
]

export function AgentConsole({ running, setRunning }: any) {
  const isChatbotExpanded = useDiagramStore((state) => state.isChatbotExpanded)
  const setIsChatbotExpanded = useDiagramStore((state) => state.setIsChatbotExpanded)
  const [currentState, setCurrentState] = useState<keyof typeof agentStates>('IDLE')
  const [autoScroll, setAutoScroll] = useState(true)

  const state = agentStates[currentState]

  if (!isChatbotExpanded) {
    return (
      <button 
        onClick={() => setIsChatbotExpanded(true)}
        className="h-12 border-t border-gray-200 bg-white flex items-center justify-between px-4 hover:bg-gray-50 w-full"
      >
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${state.dot}`}
            animate={{ scale: running ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 1, repeat: running ? Infinity : 0 }}
          />
          <span className="text-sm font-medium">{state.label}</span>
        </div>
        <ChevronUp className="w-4 h-4" />
      </button>
    )
  }

  return (
    <motion.div
      className="border-t border-gray-200 bg-[#0b1c2c] text-white flex flex-col"
      style={{ height: '320px' }}
      initial={{ height: 0 }}
      animate={{ height: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-3 h-3 rounded-full ${state.dot}`}
            animate={{ scale: running ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 1, repeat: running ? Infinity : 0 }}
          />
          <div>
            <p className="text-sm font-semibold">{state.label}</p>
            <p className="text-xs text-gray-400">Agent Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-gray-800 text-gray-400 hover:text-white"
            onClick={() => setRunning(!running)}
          >
            {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-gray-800 text-gray-400 hover:text-white"
            onClick={() => setCurrentState('IDLE')}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <button 
            onClick={() => setIsChatbotExpanded(false)}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 bg-[#0f1419]">
        {mockLogs.map((log, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-gray-600 w-12 flex-shrink-0">{String(i + 1).padStart(3, '0')}</span>
            <span className={`${
              log.level === 'success' ? 'text-green-400' :
              log.level === 'error' ? 'text-red-400' :
              log.level === 'planning' ? 'text-blue-400' :
              log.level === 'executing' ? 'text-amber-400' :
              'text-gray-400'
            }`}>
              {log.message}
            </span>
            {log.level === 'success' && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 flex items-center gap-2 bg-[#0b1c2c]">
        <Button
          size="sm"
          className="bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white hover:shadow-lg"
          onClick={() => setRunning(!running)}
        >
          {running ? (
            <>
              <Square className="w-3 h-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Run Agent
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">
          {mockLogs.length} lines
        </span>
      </div>
    </motion.div>
  )
}
