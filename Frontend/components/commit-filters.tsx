'use client'

import { RefreshCw, Search } from 'lucide-react'

interface CommitFiltersProps {
  branches: { name: string }[]
  selectedBranch: string
  onBranchChange: (branch: string) => void
  author: string
  onAuthorChange: (author: string) => void
  onRefresh: () => void
  loading: boolean
}

export function CommitFilters({
  branches,
  selectedBranch,
  onBranchChange,
  author,
  onAuthorChange,
  onRefresh,
  loading,
}: CommitFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="w-full appearance-none bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 pr-8 text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-colors cursor-pointer"
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name} className="bg-[#0d1220] text-white/80">
              {b.name}
            </option>
          ))}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
            <path d="M0 0l5 6 5-6z" />
          </svg>
        </div>
      </div>

      <div className="relative flex-[2]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <input
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="Filter by author..."
          className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-colors"
        />
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all disabled:opacity-40"
        title="Refresh commits"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
