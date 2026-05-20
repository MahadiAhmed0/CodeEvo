'use client'

import { useState } from 'react'
import { X, Send, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface APITestingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNode?: any
}

export function APITestingModal({ isOpen, onClose, selectedNode }: APITestingModalProps) {
  const [method, setMethod] = useState('GET')
  const [endpoint, setEndpoint] = useState('/users')
  const [headers, setHeaders] = useState({ 'Content-Type': 'application/json' })
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleSendRequest = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:${selectedNode?.port || 8080}${endpoint}`, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined,
      })
      const data = await response.json()
      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        body: data,
        time: new Date().toLocaleTimeString(),
      })
    } catch (error) {
      setResponse({
        status: 'ERROR',
        error: (error as Error).message,
        time: new Date().toLocaleTimeString(),
      })
    }
    setLoading(false)
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const methodColors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    POST: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
    PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0d1220] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-white/[0.08] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">API Testing — {selectedNode?.data?.name || selectedNode?.name || 'Service'}</h2>
            <p className="text-white/60 text-xs mt-0.5 font-mono">localhost:{selectedNode?.data?.port || selectedNode?.port || 8080}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex gap-6 p-6">
          {/* Request Builder */}
          <div className="flex-1 space-y-4">
            <h3 className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Request</h3>

            {/* Method & URL */}
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={`px-3 py-2.5 border rounded-xl font-bold text-[13px] outline-none ${methodColors[method] || methodColors.GET}`}
                style={{ backgroundColor: 'transparent' }}
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <option key={m} value={m} className="bg-[#0d1220] text-white">
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/endpoint"
                className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white/80 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200 font-mono"
              />
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="px-4 py-2.5 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] text-white rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                <Send size={14} />
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Headers */}
            <div>
              <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Headers</label>
              <div className="mt-2 bg-white/[0.02] rounded-xl p-3 border border-white/[0.06] text-[11px] space-y-1 font-mono">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-semibold text-purple-400/60">{key}:</span>
                    <span className="text-white/40">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body */}
            {method !== 'GET' && (
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Request Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full mt-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white/70 outline-none focus:border-purple-500/30 font-mono h-32 resize-none transition-all duration-200"
                />
              </div>
            )}
          </div>

          {/* Response */}
          <div className="flex-1 space-y-4">
            <h3 className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Response</h3>

            {response ? (
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#6c3bf5]/20 to-[#c74cf0]/20 border border-purple-500/20 px-4 py-3 rounded-xl">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Status</p>
                    <p className="text-2xl font-bold text-white/90 mt-0.5">{response.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-white/50">{response.statusText}</p>
                    <p className="text-[11px] text-white/25 font-mono">{response.time}</p>
                  </div>
                </div>

                {/* Response Body */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Body</label>
                    <button
                      onClick={copyResponse}
                      className="px-2.5 py-1 text-[11px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg flex items-center gap-1.5 transition-all text-white/40 hover:text-white/70"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 overflow-x-auto text-[11px] font-mono text-emerald-400/60 max-h-60 overflow-y-auto scrollbar-thin">
                    {JSON.stringify(response.body || response.error, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-white/15 text-[13px]">
                <Send className="w-8 h-8 mb-3 opacity-30" />
                <p>Send a request to see the response</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
