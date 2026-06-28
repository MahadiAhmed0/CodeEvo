'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X, GitBranch, Upload, Loader2, CheckCircle2, AlertCircle,
  FileCode2, ExternalLink, ToggleLeft, ToggleRight, FilePlus2,
  FileMinus2, FileEdit, GitCommitHorizontal, ArrowUp, ArrowDown,
  RefreshCw
} from 'lucide-react'
import { githubPushApi, type SyncChange } from '@/lib/api'
import { toast } from 'sonner'

interface PushToGitHubModalProps {
  projectId: string
  defaultBranch?: string
  onClose: () => void
}

interface PushResult {
  file: string
  status: 'success' | 'failed' | 'deleted'
  commit?: string
  error?: string
}

const typeIcons: Record<string, React.ReactNode> = {
  added: <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />,
  modified: <FileEdit className="w-3.5 h-3.5 text-amber-400" />,
  deleted: <FileMinus2 className="w-3.5 h-3.5 text-red-400" />,
}

const typeLabels: Record<string, string> = {
  added: 'New',
  modified: 'Modified',
  deleted: 'Deleted',
}

export function PushToGitHubModal({ projectId, defaultBranch, onClose }: PushToGitHubModalProps) {
  const [changes, setChanges] = useState<SyncChange[]>([])
  const [loadingDiff, setLoadingDiff] = useState(true)
  const [commitMessage, setCommitMessage] = useState('CodeEvo: Update project code')
  const [branch, setBranch] = useState(defaultBranch || 'main')
  const [createPr, setCreatePr] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [pushing, setPushing] = useState(false)
  const [results, setResults] = useState<PushResult[] | null>(null)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [ahead, setAhead] = useState(false)
  const [behind, setBehind] = useState(false)
  const [aheadBy, setAheadBy] = useState(0)
  const [behindBy, setBehindBy] = useState(0)
  const [lastPushedSha, setLastPushedSha] = useState<string | null>(null)

  useEffect(() => {
    githubPushApi.getSyncDiff(projectId)
      .then((data) => {
        if (!data.linked) {
          toast.error('Project is not linked to a GitHub repository')
          onClose()
          return
        }
        setChanges(data.changes)
        setAhead(data.ahead)
        setBehind(data.behind)
        setAheadBy(data.aheadBy)
        setBehindBy(data.behindBy)
        setLastPushedSha(data.lastPushedCommitSha)
      })
      .catch((err) => {
        toast.error('Failed to load sync status: ' + (err.message || 'Unknown error'))
        onClose()
      })
      .finally(() => setLoadingDiff(false))
  }, [projectId, onClose])

  const handlePush = async () => {
    setPushing(true)
    setResults(null)
    try {
      const res = await githubPushApi.pushToGitHub(projectId, {
        message: commitMessage,
        branch,
        createPr,
        prTitle: prTitle || undefined,
      })
      setResults(res.results || [])
      setSuccess(res.success)
      setPrUrl(res.prUrl || null)
      if (res.success) {
        toast.success(`Pushed ${res.filesProcessed} file(s) to ${branch}`)
      } else {
        toast.error('Some files failed to push')
      }
    } catch (err: any) {
      toast.error(err.message || 'Push failed')
      setSuccess(false)
    } finally {
      setPushing(false)
    }
  }

  const handleRefreshDiff = async () => {
    setLoadingDiff(true)
    try {
      const data = await githubPushApi.getSyncDiff(projectId)
      if (!data.linked) {
        toast.error('Project is not linked to a GitHub repository')
        onClose()
        return
      }
      setChanges(data.changes)
      setAhead(data.ahead)
      setBehind(data.behind)
      setAheadBy(data.aheadBy)
      setBehindBy(data.behindBy)
      setLastPushedSha(data.lastPushedCommitSha)
    } catch (err: any) {
      toast.error('Failed to refresh: ' + (err.message || 'Unknown error'))
    } finally {
      setLoadingDiff(false)
    }
  }

  const failedCount = results ? results.filter(r => r.status === 'failed').length : 0
  const addedCount = changes.filter(c => c.type === 'added').length
  const modifiedCount = changes.filter(c => c.type === 'modified').length
  const deletedCount = changes.filter(c => c.type === 'deleted').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#0a0e1a] border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d1220]">
          <div className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Push to GitHub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 bg-[#06080d] space-y-4 overflow-y-auto max-h-[60vh]">
          {loadingDiff ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
          ) : results ? (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <p className={`text-sm font-medium ${success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {success ? 'Push successful' : 'Push completed with errors'}
                  </p>
                  <p className="text-xs text-white/40">
                    {results.length} file(s) processed, {failedCount} failed
                  </p>
                </div>
              </div>

              {prUrl && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Pull Request
                </a>
              )}

              <div className="space-y-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      r.status === 'success'
                        ? 'bg-emerald-500/5 text-emerald-400/80'
                        : r.status === 'deleted'
                          ? 'bg-red-500/5 text-red-400/60'
                          : 'bg-red-500/5 text-red-400/80'
                    }`}
                  >
                    {r.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : r.status === 'deleted' ? (
                      <FileMinus2 className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate font-mono">{r.file}</span>
                    <span className="text-white/30 text-[10px]">{r.status}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setResults(null); handleRefreshDiff() }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Push Again
              </button>
            </div>
          ) : (
            <>
              {/* Sync status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <GitCommitHorizontal className="w-4 h-4 text-white/40" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs">
                    {lastPushedSha ? (
                      <>
                        <span className="text-white/40">
                          Last push: <span className="font-mono text-white/60">{lastPushedSha.substring(0, 7)}</span>
                        </span>
                        {ahead && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ArrowUp className="w-3 h-3" /> {aheadBy} ahead
                          </span>
                        )}
                        {behind && (
                          <span className="flex items-center gap-1 text-red-400">
                            <ArrowDown className="w-3 h-3" /> {behindBy} behind
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-white/40">First push to this branch</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleRefreshDiff}
                  className="p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {behind && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Remote is ahead by {behindBy} commit(s). Push will create a merge conflict. Pull first or force push.</span>
                </div>
              )}

              {/* Changes summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">
                    {changes.length > 0 ? `${changes.length} Change(s)` : 'No changes'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-white/40">
                    {addedCount > 0 && <span className="text-emerald-400">+{addedCount}</span>}
                    {modifiedCount > 0 && <span className="text-amber-400">~{modifiedCount}</span>}
                    {deletedCount > 0 && <span className="text-red-400">-{deletedCount}</span>}
                  </div>
                </div>
                {changes.length > 0 ? (
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {changes.map((change, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] text-xs"
                      >
                        <span className="flex-shrink-0 w-4">{typeIcons[change.type]}</span>
                        <span className="flex-1 truncate font-mono text-white/60">{change.filePath}</span>
                        <span className="text-white/20 text-[10px]">{typeLabels[change.type]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40 py-4 text-center">Everything is up to date</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Commit Message</label>
                <input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 focus:border-purple-500/30 focus:bg-white/[0.06] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Branch</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <GitBranch className="w-4 h-4 text-white/30" />
                  <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="flex-1 bg-transparent text-[13px] text-white/80 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <p className="text-sm text-white/80">Create Pull Request</p>
                  <p className="text-xs text-white/40">Push to a new branch and open a PR</p>
                </div>
                <button
                  onClick={() => setCreatePr(!createPr)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                >
                  {createPr ? <ToggleRight className="w-6 h-6 text-purple-400" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              {createPr && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">PR Title (optional)</label>
                  <input
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder={commitMessage}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 focus:border-purple-500/30 focus:bg-white/[0.06] outline-none transition-colors"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.06] bg-[#0d1220] gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && changes.length > 0 && (
            <button
              onClick={handlePush}
              disabled={pushing || loadingDiff || behind}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] hover:shadow-[0_0_15px_rgba(108,59,245,0.4)] text-white rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pushing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {pushing ? 'Pushing...' : `Push ${changes.length} change(s)`}
            </button>
          )}
          {!results && changes.length === 0 && !loadingDiff && (
            <span className="text-[13px] text-white/40">Nothing to push</span>
          )}
        </div>
      </motion.div>
    </div>
  )
}
