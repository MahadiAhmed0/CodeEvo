'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, Loader2, CheckCircle2, AlertCircle,
  Plug, PlugZap, ExternalLink
} from 'lucide-react'

interface GitHubSyncStatusProps {
  linked: boolean
  fullName?: string
  activeBranch?: string
  onSyncNow?: () => Promise<void>
  onRegisterWebhook?: () => Promise<void>
  onRemoveWebhook?: () => Promise<void>
}

type SyncState = 'connected' | 'syncing' | 'error' | 'disconnected'

export function GitHubSyncStatus({
  linked,
  fullName,
  activeBranch,
  onSyncNow,
  onRegisterWebhook,
  onRemoveWebhook,
}: GitHubSyncStatusProps) {
  const [webhookRegistered, setWebhookRegistered] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('disconnected')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!linked) {
      setSyncState('disconnected')
      setWebhookRegistered(false)
    } else {
      setSyncState('connected')
    }
  }, [linked])

  const handleSync = async () => {
    if (!onSyncNow) return
    setSyncing(true)
    setSyncState('syncing')
    try {
      await onSyncNow()
      setLastSynced(new Date())
      setSyncState('connected')
    } catch {
      setSyncState('error')
    } finally {
      setSyncing(false)
    }
  }

  const handleWebhookToggle = async () => {
    if (webhookRegistered) {
      try {
        await onRemoveWebhook?.()
        setWebhookRegistered(false)
      } catch {}
    } else {
      try {
        await onRegisterWebhook?.()
        setWebhookRegistered(true)
      } catch {}
    }
  }

  if (!linked) return null

  const dotColor = syncState === 'connected'
    ? 'bg-emerald-400'
    : syncState === 'syncing'
    ? 'bg-yellow-400'
    : syncState === 'error'
    ? 'bg-red-400'
    : 'bg-gray-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor} ${syncState === 'syncing' ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium text-white/70">GitHub Sync</span>
        </div>
        {fullName && (
          <a
            href={`https://github.com/${fullName}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {fullName}
          </a>
        )}
      </div>

      {activeBranch && (
        <div className="text-[11px] text-white/40 font-mono">
          Branch: <span className="text-purple-400/60">{activeBranch}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/60 hover:text-white/80 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Sync Now
        </button>

        <button
          onClick={handleWebhookToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] transition-colors ${
            webhookRegistered
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.08]'
          }`}
        >
          {webhookRegistered ? (
            <PlugZap className="w-3 h-3" />
          ) : (
            <Plug className="w-3 h-3" />
          )}
          {webhookRegistered ? 'Webhook Active' : 'Register Webhook'}
        </button>
      </div>

      {lastSynced && (
        <div className="text-[10px] text-white/30">
          Last synced: {lastSynced.toLocaleTimeString()}
        </div>
      )}

      {syncState === 'error' && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertCircle className="w-3 h-3" />
          Sync failed. Check connection and try again.
        </div>
      )}
    </motion.div>
  )
}
