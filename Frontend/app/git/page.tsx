'use client'

import { Navbar } from '@/components/navbar'
import { motion } from 'framer-motion'
import { 
  GitBranch, 
  GitCommit, 
  ArrowRight,
  Clock,
  Eye,
  Server,
  Database,
  FileCode2,
  Code,
  Network,
  Github,
  RefreshCw,
  AlertTriangle,
  FileJson,
  Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { githubCommitApi, githubRepoApi, projectApi } from '@/lib/api'
import { useGitHubStore } from '@/lib/github-store'

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

function formatSha(sha: string): string {
  return sha ? sha.substring(0, 7) : ''
}

function validateDiagramStructure(json: any): { valid: boolean; reason?: string; nodes?: number; edges?: number } {
  if (!json || typeof json !== 'object') return { valid: false, reason: 'Not a valid JSON object' }
  if (!Array.isArray(json.nodes)) return { valid: false, reason: 'Missing or invalid "nodes" array' }
  if (!Array.isArray(json.edges)) return { valid: false, reason: 'Missing or invalid "edges" array' }
  const suspicious = json.nodes.some((n: any) =>
    n?.data?.label?.toLowerCase().includes('hack') ||
    n?.data?.label?.toLowerCase().includes('inject') ||
    n?.id?.toLowerCase().includes('malicious')
  )
  if (suspicious) return { valid: false, reason: 'Diagram contains suspicious or abstract patterns' }
  return { valid: true, nodes: json.nodes.length, edges: json.edges.length }
}

export default function GitVisualizationPage() {
  const { connected: githubConnected, githubUser } = useGitHubStore()

  const [linkedRepos, setLinkedRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
  const [branches, setBranches] = useState<{ name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [projectName, setProjectName] = useState('')

  const [commits, setCommits] = useState<any[]>([])
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [diagramState, setDiagramState] = useState<'loading' | 'not-found' | 'invalid' | 'valid'>('loading')
  const [diagramInfo, setDiagramInfo] = useState<{ nodes: number; edges: number } | null>(null)
  const [diagramData, setDiagramData] = useState<any>(null)
  const [diagramError, setDiagramError] = useState<string | null>(null)

  // Load linked repos on mount
  useEffect(() => {
    Promise.all([
      githubRepoApi.listLinkedRepos(),
      projectApi.listProjects(),
    ]).then(([repos, projects]) => {
      const projectMap = new Map<string, string>()
      if (projects?.content) {
        for (const p of projects.content) projectMap.set(p.id, p.name)
      }
      const enriched = repos.map((r: any) => ({
        ...r,
        projectName: projectMap.get(r.projectId) || r.projectId,
      }))
      setLinkedRepos(enriched)
      if (enriched.length > 0) {
        setSelectedRepo(enriched[0])
        setSelectedBranch(enriched[0].activeBranch || enriched[0].defaultBranch || 'main')
        setProjectName(enriched[0].projectName)
      }
    }).catch(() => {})
  }, [])

  // Fetch branches when repo changes
  useEffect(() => {
    if (selectedRepo) {
      const [owner, repo] = selectedRepo.fullName.split('/')
      if (owner && repo) {
        githubRepoApi.listBranches(owner, repo)
          .then((data) => setBranches(data))
          .catch(() => setBranches([{ name: selectedBranch }]))
      }
    }
  }, [selectedRepo])

  // Fetch commits when repo or branch changes
  useEffect(() => {
    if (!selectedRepo) return
    setLoading(true)
    setError(null)
    githubCommitApi.listCommits(selectedRepo.projectId, 1, 30, selectedBranch !== selectedRepo.defaultBranch ? selectedBranch : undefined)
      .then((data) => {
        setCommits(data)
        setSelectedCommit((prev: any) => {
          if (prev && data.some((c: any) => c.sha === prev.sha)) return prev
          return data[0] || null
        })
      })
      .catch((err: any) => setError(err.message ?? 'Failed to load commits'))
      .finally(() => setLoading(false))
  }, [selectedRepo, selectedBranch])

  // Fetch detailed commit info (stats/files) when selectedCommit changes
  useEffect(() => {
    if (!selectedRepo || !selectedCommit || selectedCommit.files) return
    githubCommitApi.getCommit(selectedRepo.projectId, selectedCommit.sha)
      .then((detail) => {
        setSelectedCommit((prev: any) => {
          if (prev?.sha === detail.sha) return { ...prev, ...detail }
          return prev
        })
        setCommits((prev) => prev.map(c => c.sha === detail.sha ? { ...c, ...detail } : c))
      })
      .catch(console.error)
  }, [selectedRepo, selectedCommit])

  // Fetch diagram from project API
  useEffect(() => {
    if (!selectedRepo) return
    setDiagramState('loading')
    setDiagramInfo(null)
    setDiagramError(null)
    projectApi.getDiagram(selectedRepo.projectId)
      .then((res) => {
        if (!res || !Array.isArray(res.nodes) || !Array.isArray(res.edges)) {
          setDiagramState('not-found')
          setDiagramData(null)
          return
        }
        setDiagramState('valid')
        setDiagramInfo({ nodes: res.nodes.length, edges: res.edges.length })
        setDiagramData(res)
      })
      .catch(() => setDiagramState('not-found'))
  }, [selectedRepo, selectedBranch])
  const handleRepoChange = (fullName: string) => {
    const repo = linkedRepos.find(r => r.fullName === fullName)
    if (repo) {
      setSelectedRepo(repo)
      setSelectedBranch(repo.activeBranch || repo.defaultBranch || 'main')
      setProjectName(repo.projectName || '')
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e1a] text-white">
      <Navbar />
      <main className="flex-1 overflow-auto flex">
        {/* Timeline */}
        <div className="w-96 border-r border-white/[0.06] bg-[#0d1220] overflow-y-auto">
          <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/[0.06] bg-[#0d1220]/95 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Git Timeline</h2>
              <div className="flex items-center gap-1">
                <Github className="w-3.5 h-3.5 text-white/30" />
                <select
                  value={selectedRepo?.fullName || ''}
                  onChange={(e) => handleRepoChange(e.target.value)}
                  className="text-[11px] bg-transparent text-white/50 outline-none max-w-[130px] truncate"
                >
                  {linkedRepos.map((r) => (
                    <option key={r.projectId} value={r.fullName}>{r.repoName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <GitBranch className="w-3.5 h-3.5 text-white/40" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-xs bg-transparent text-white/60 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <span className="text-white/30">|</span>
              <span className="text-white/40">{projectName}</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {loading && commits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <p className="text-sm text-white/40">Loading commits...</p>
              </div>
            )}

            {error && commits.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <AlertTriangle className="w-8 h-8 text-red-400/60" />
                <p className="text-sm text-white/60 text-center">{error}</p>
              </div>
            )}

            {!loading && !error && commits.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <GitCommit className="w-8 h-8 text-white/10" />
                <p className="text-sm text-white/40 text-center">No commits found</p>
                <p className="text-xs text-white/30 text-center">Select a repository and branch to view commits.</p>
              </div>
            )}

            {commits.map((commit, i) => (
              <motion.div
                key={commit.sha}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedCommit(commit)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedCommit?.sha === commit.sha
                    ? 'border-[#6c3bf5]/50 bg-gradient-to-r from-[#6c3bf5]/10 to-[#c74cf0]/10 shadow-lg shadow-purple-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-purple-400">{formatSha(commit.sha)}</p>
                    <p className="text-sm font-medium text-white/90 mt-1 line-clamp-2">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                      <span>{commit.author || 'Unknown'}</span>
                      <span>•</span>
                      <span>{commit.date ? formatRelativeTime(commit.date) : ''}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-auto">
          {selectedCommit && (
            <div className="p-8">
              {/* Commit Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <GitCommit className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">{selectedCommit.message}</h1>
                    <p className="text-white/60 mt-2">Commit <span className="font-mono text-purple-400">{formatSha(selectedCommit.sha)}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <span>By {selectedCommit.author || 'Unknown'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedCommit.date ? formatRelativeTime(selectedCommit.date) : ''}
                  </span>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {selectedCommit.stats ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm text-white/60 mb-1 font-semibold">Additions</p>
                        <p className="text-2xl font-bold text-emerald-400">+{selectedCommit.stats.additions ?? 0}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Code className="w-5 h-5 text-emerald-400" />
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm text-white/60 mb-1 font-semibold">Deletions</p>
                        <p className="text-2xl font-bold text-red-400">-{selectedCommit.stats.deletions ?? 0}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <FileCode2 className="w-5 h-5 text-red-400" />
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm text-white/60 mb-1 font-semibold">Files Changed</p>
                        <p className="text-2xl font-bold text-blue-400">{selectedCommit.stats.total ?? 0}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FileCode2 className="w-5 h-5 text-blue-400" />
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm text-white/60 mb-1 font-semibold">Total</p>
                        <p className="text-2xl font-bold text-purple-400">{(selectedCommit.stats.additions ?? 0) + (selectedCommit.stats.deletions ?? 0)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <GitCommit className="w-5 h-5 text-purple-400" />
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center"
                  >
                    <p className="text-sm text-white/40">Loading commit details...</p>
                  </motion.div>
                )}
              </div>

              {/* Architecture Diagram */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8 p-6 rounded-xl bg-[#0d1220] border border-white/[0.06]"
              >
                <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
                  <Network className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-lg font-semibold text-white">Architecture Snapshot</p>
                    <p className="text-sm text-white/50">{diagramInfo?.nodes || 0} service nodes · {diagramInfo?.edges || 0} connections</p>
                  </div>
                </div>

                {diagramState === 'loading' && (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching diagram from project...
                  </div>
                )}

                {diagramState === 'not-found' && (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <FileJson className="w-8 h-8 text-white/10" />
                    <p className="text-sm text-white/40">No architecture diagram found for this project</p>
                    <p className="text-xs text-white/25">Use the Architecture tab to design your system</p>
                  </div>
                )}

                {diagramState === 'invalid' && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Invalid diagram structure</p>
                      <p className="text-xs text-red-300/70 mt-1">{diagramError}</p>
                    </div>
                  </div>
                )}

                {diagramState === 'valid' && diagramData && (() => {
                  const gatewayNodes = diagramData.nodes.filter((n: any) => n.data?.type === 'api' || n.data?.type === 'gateway');
                  const serviceNodes = diagramData.nodes.filter((n: any) => n.data?.type === 'service' || n.data?.type === 'queue');
                  const dbNodes = diagramData.nodes.filter((n: any) => n.data?.type === 'database');
                  return (
                    <div className="relative bg-[#0a0e1a] rounded-xl p-8 border border-white/[0.06] overflow-hidden" style={{ minHeight: '340px' }}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                      <div className="relative flex flex-row items-center justify-center gap-8 md:gap-12 h-full z-10 w-full pt-4">
                        {gatewayNodes.length > 0 && (
                          <div className="flex flex-col items-center gap-6">
                            {gatewayNodes.map((node: any) => (
                              <motion.div key={node.id} whileHover={{ scale: 1.05 }} className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 border border-indigo-400/30 flex items-center justify-center shadow-lg mb-3 shadow-indigo-500/20">
                                  <Network className="w-8 h-8 text-white" />
                                </div>
                                <p className="font-semibold text-white/90 text-sm">{node.data?.name || node.id}</p>
                                {(node.data?.gatewayConfig?.language || node.data?.language) && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-mono mt-1">{node.data?.gatewayConfig?.language || node.data?.language}</span>}
                              </motion.div>
                            ))}
                          </div>
                        )}
                        {gatewayNodes.length > 0 && (serviceNodes.length > 0 || dbNodes.length > 0) && (
                          <div className="flex flex-col gap-12 text-white/20">
                            <svg width="40" height={Math.max(gatewayNodes.length, 1) * 160} viewBox={`0 0 40 ${Math.max(gatewayNodes.length, 1) * 160}`} className="opacity-60">
                              {serviceNodes.slice(0, Math.max(gatewayNodes.length, 1)).map((_: any, i: number) => (
                                <path key={i} d={`M0 ${60 + i * 160} L20 ${60 + i * 160} L20 ${10 + i * 160} L40 ${10 + i * 160}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                              ))}
                            </svg>
                          </div>
                        )}
                        {serviceNodes.length > 0 && (
                          <div className="flex flex-col gap-10">
                            {serviceNodes.map((node: any) => (
                              <motion.div key={node.id} whileHover={{ scale: 1.05 }} className="flex flex-col items-center group relative">
                                <div className="absolute -inset-2 bg-blue-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-20 h-20 relative rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-400/20 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20 z-10">
                                  <Server className="w-9 h-9 text-white" />
                                </div>
                                <p className="font-semibold text-white/90">{node.data?.name || node.id}</p>
                                {node.data?.language && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono mt-1">{node.data.language}</span>}
                              </motion.div>
                            ))}
                          </div>
                        )}
                        {serviceNodes.length > 0 && dbNodes.length > 0 && (
                          <div className="flex flex-col gap-10">
                            {serviceNodes.slice(0, dbNodes.length).map((_: any, i: number) => (
                              <div key={i} className="flex items-center text-white/20 h-24">
                                <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
                                  <line x1="0" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                                  <polygon points="35,5 40,10 35,15" fill="currentColor" />
                                </svg>
                              </div>
                            ))}
                          </div>
                        )}
                        {dbNodes.length > 0 && (
                          <div className="flex flex-col gap-10">
                            {dbNodes.map((node: any) => (
                              <motion.div key={node.id} whileHover={{ scale: 1.05 }} className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-400/30 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                                  <Database className="w-8 h-8 text-white" />
                                </div>
                                <p className="font-semibold text-white/90 text-sm">{node.data?.name || node.id}</p>
                                {node.data?.engine && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono mt-1">{node.data.engine}</span>}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>

              {/* Changed Files */}
              {selectedCommit.files && selectedCommit.files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col gap-6"
                >
                  <h2 className="text-xl font-bold text-white mb-2">Changed Files ({selectedCommit.files.length})</h2>
                  {selectedCommit.files.slice(0, 20).map((file: any, i: number) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0d1220]">
                      {/* File Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          {file.status === 'added' && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">ADDED</span>}
                          {file.status === 'modified' && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">MODIFIED</span>}
                          {file.status === 'removed' && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">REMOVED</span>}
                          {file.status === 'renamed' && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">RENAMED</span>}
                          <span className="font-mono text-sm text-white/90">{file.filename}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-emerald-400">+{file.additions}</span>
                          <span className="text-red-400">-{file.deletions}</span>
                        </div>
                      </div>
                      
                      {/* File Diff / Patch */}
                      {file.patch ? (
                        <div className="overflow-x-auto bg-[#0a0e1a] py-3 text-[13px] leading-relaxed font-mono">
                          {file.patch.split('\n').map((line: string, index: number) => (
                            <div 
                              key={index} 
                              className={`px-4 whitespace-pre ${
                                line.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' 
                                : line.startsWith('-') ? 'bg-red-500/10 text-red-400' 
                                : line.startsWith('@@') ? 'text-blue-400/70 py-2' 
                                : 'text-white/60'
                              }`}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-[#0a0e1a] text-sm text-white/40 italic">
                          No diff available or binary file
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedCommit.files.length > 20 && (
                    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center text-sm text-white/40">
                      ...and {selectedCommit.files.length - 20} more files
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
