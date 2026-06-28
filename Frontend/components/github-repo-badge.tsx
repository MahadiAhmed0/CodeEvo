'use client'

import { GitBranch } from 'lucide-react'

interface GitHubRepoBadgeProps {
  fullName: string
  branch: string
  onClick?: () => void
}

export function GitHubRepoBadge({ fullName, branch, onClick }: GitHubRepoBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-colors w-full"
    >
      <GitBranch className="w-3 h-3 shrink-0" />
      <span className="truncate">{fullName}</span>
      <span className="text-white/30">:</span>
      <span className="font-mono text-purple-400/60 shrink-0">{branch}</span>
    </button>
  )
}
