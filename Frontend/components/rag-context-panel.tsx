'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileCode2, ChevronDown, ChevronUp, Loader2, BookOpen, Sparkles } from 'lucide-react'

interface CodeChunk {
  filePath: string
  language: string
  startLine: number
  endLine: number
  content: string
}

interface RagContextPanelProps {
  projectId: string
  /** Pre-filled query from the agent (e.g. last user message) */
  defaultQuery?: string
}

/**
 * Phase 2: RAG Context Panel
 *
 * Shows semantically relevant code chunks for a given query.
 * Users can also type a custom query to manually search the codebase.
 * Results come from the /api/rag/{projectId}/chunks endpoint which
 * performs vector similarity search over MongoDB-stored embeddings.
 */
export function RagContextPanel({ projectId, defaultQuery = '' }: RagContextPanelProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [chunks, setChunks] = useState<CodeChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [indexedCount, setIndexedCount] = useState<number | null>(null)
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set([0]))
  const [indexing, setIndexing] = useState(false)

  // Fetch indexing status on mount
  useEffect(() => {
    if (!projectId || projectId === 'default') return
    const token = localStorage.getItem('authToken') ?? ''
    fetch(`/api/rag/${projectId}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setIndexedCount(data.indexedChunks ?? 0))
      .catch(() => setIndexedCount(0))
  }, [projectId])

  // Auto-search when defaultQuery changes (triggered by agent message)
  useEffect(() => {
    if (defaultQuery && defaultQuery.length > 5) {
      setQuery(defaultQuery)
      doSearch(defaultQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultQuery])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !projectId || projectId === 'default') return
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken') ?? ''
      const res = await fetch(
        `/api/rag/${projectId}/chunks?query=${encodeURIComponent(q)}&topK=6`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data: CodeChunk[] = await res.json()
        setChunks(data)
        setExpandedSet(new Set([0]))
      }
    } catch (e) {
      console.error('Context search failed', e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleIndex = async () => {
    setIndexing(true)
    const token = localStorage.getItem('authToken') ?? ''
    try {
      await fetch(`/api/rag/${projectId}/index`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTimeout(() => {
        fetch(`/api/rag/${projectId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => setIndexedCount(d.indexedChunks ?? 0))
          .catch(() => {})
      }, 3000)
    } finally {
      setIndexing(false)
    }
  }

  const toggleExpand = (i: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0e1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-purple-400" />
          <span className="text-[12px] font-semibold text-white/70">Code Context</span>
          {indexedCount !== null && (
            <span className="text-[10px] text-white/20 font-mono">
              {indexedCount.toLocaleString()} chunks
            </span>
          )}
        </div>
        <button
          onClick={handleIndex}
          disabled={indexing}
          title="Re-index project codebase for semantic search"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]
                     bg-purple-500/[0.08] border border-purple-500/20 text-purple-300/70
                     hover:bg-purple-500/[0.15] hover:text-purple-300 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {indexing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          {indexing ? 'Indexing…' : 'Re-index'}
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]
                        focus-within:border-purple-500/30 transition-colors">
          <Search size={12} className="text-white/25 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            placeholder="Search codebase semantically…"
            className="flex-1 bg-transparent text-[12px] text-white/70 placeholder-white/20
                       outline-none caret-purple-400"
          />
          {loading && <Loader2 size={12} className="text-purple-400/60 animate-spin shrink-0" />}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {/* No-index state */}
        {indexedCount === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-center px-4">
            <Sparkles size={20} className="text-purple-500/40" />
            <p className="text-[11px] text-white/25 leading-relaxed">
              No code indexed yet. Click{' '}
              <strong className="text-white/40">Re-index</strong> to enable
              semantic search across your project.
            </p>
          </div>
        )}

        {/* Empty query state */}
        {chunks.length === 0 && !loading && indexedCount !== 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <Search size={16} className="text-white/15" />
            <p className="text-[11px] text-white/20">
              {query ? 'No matching code found' : 'Type a query or ask the AI agent'}
            </p>
          </div>
        )}

        {/* Chunk results */}
        <AnimatePresence>
          {chunks.map((chunk, i) => (
            <motion.div
              key={`${chunk.filePath}-${chunk.startLine}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.015] overflow-hidden"
            >
              {/* Chunk header */}
              <button
                id={`rag-chunk-${i}`}
                onClick={() => toggleExpand(i)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors"
              >
                <FileCode2 size={11} className="text-purple-400/70 shrink-0" />
                <span className="flex-1 text-left text-[10px] font-mono text-white/50 truncate">
                  {chunk.filePath.split('/').slice(-2).join('/')}
                </span>
                <span className="text-[9px] text-white/20 font-mono shrink-0">
                  L{chunk.startLine}–{chunk.endLine}
                </span>
                {expandedSet.has(i)
                  ? <ChevronUp size={10} className="text-white/20 shrink-0" />
                  : <ChevronDown size={10} className="text-white/20 shrink-0" />
                }
              </button>

              {/* Code content */}
              <AnimatePresence>
                {expandedSet.has(i) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <pre className="px-3 pb-3 pt-2 text-[10px] font-mono text-white/40 leading-relaxed
                                    overflow-x-auto max-h-48 border-t border-white/[0.04]">
                      {chunk.content}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
