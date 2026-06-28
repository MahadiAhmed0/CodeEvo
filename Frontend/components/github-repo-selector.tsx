'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Star, GitFork, Lock, Globe, Loader2, Check, ChevronRight } from 'lucide-react'
import { githubRepoApi } from '@/lib/api'
import { toast } from 'sonner'

interface GitHubRepoSelectorProps {
  projectId: string
  onLinked: (fullName: string, branch: string) => void
  onClose: () => void
}

export function GitHubRepoSelector({ projectId, onLinked, onClose }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    githubRepoApi.listRepos(1, 100)
      .then(setRepos)
      .catch((err) => toast.error(err.message ?? 'Failed to load repositories'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = repos.filter((repo) =>
    repo.name?.toLowerCase().includes(search.toLowerCase()) ||
    repo.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectRepo = async (repo: any) => {
    setSelectedRepo(repo)
    setSelectedBranch(repo.default_branch || 'main')
    setBranchesLoading(true)
    setBranches([])
    try {
      const owner = repo.owner?.login || repo.full_name?.split('/')[0]
      const name = repo.name
      const branchData = await githubRepoApi.listBranches(owner, name)
      setBranches(branchData)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load branches')
    } finally {
      setBranchesLoading(false)
    }
  }

  const handleLink = async () => {
    if (!selectedRepo) return
    setLinking(true)
    try {
      const owner = selectedRepo.owner?.login || selectedRepo.full_name?.split('/')[0]
      const name = selectedRepo.name
      const result = await githubRepoApi.linkProject(projectId, owner, name, selectedBranch)
      onLinked(result.fullName, selectedBranch)
      toast.success(`Linked to ${result.fullName}`)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to link repository')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#0a0e1a] border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d1220]">
          <h2 className="text-lg font-semibold text-white">Link GitHub Repository</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!selectedRepo && (
          <div className="px-6 py-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-colors"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {selectedRepo ? (
            <div className="space-y-4">
              {/* Selected repo info */}
              <div className="p-3 rounded-lg bg-white/[0.03] border border-purple-500/20">
                <p className="text-sm font-medium text-white/90">{selectedRepo.full_name || selectedRepo.name}</p>
                <p className="text-xs text-white/40 mt-1">{selectedRepo.description || 'No description'}</p>
              </div>

              {/* Branch picker */}
              <div>
                <label className="text-xs font-medium text-white/60 mb-1.5 block">Branch</label>
                {branchesLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-xs text-white/40">Loading branches...</span>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {branches.map((b: any) => (
                      <button
                        key={b.name}
                        onClick={() => setSelectedBranch(b.name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedBranch === b.name
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'text-white/60 hover:bg-white/[0.04] hover:text-white/80 border border-transparent'
                        }`}
                      >
                        <GitFork className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono text-xs">{b.name}</span>
                        {selectedBranch === b.name && <Check className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    ))}
                    {branches.length === 0 && !branchesLoading && (
                      <p className="text-xs text-white/30 py-2 text-center">No branches found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-white/40">No repositories found</p>
                </div>
              ) : (
                filtered.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80 group-hover:text-white/95 transition-colors truncate">
                          {repo.full_name || repo.name}
                        </span>
                        {repo.private && (
                          <Lock className="w-3 h-3 text-amber-400/60 shrink-0" />
                        )}
                        {!repo.private && (
                          <Globe className="w-3 h-3 text-emerald-400/60 shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-white/40 mt-0.5 truncate">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {repo.language && (
                          <span className="text-[10px] text-white/30">{repo.language}</span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/30">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count ?? 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {selectedRepo && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.06] bg-[#0d1220] gap-3">
            <button
              onClick={() => setSelectedRepo(null)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleLink}
              disabled={linking}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] hover:shadow-[0_0_15px_rgba(108,59,245,0.4)] text-white rounded-lg text-[13px] font-semibold transition-all disabled:opacity-60"
            >
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {linking ? 'Linking...' : 'Link Repository'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
