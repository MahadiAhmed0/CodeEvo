'use client'

import { useState } from 'react'
import { X, Send, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'

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

  const mockResponses: Record<string, any> = {
    'GET /users': {
      status: 200,
      statusText: 'OK',
      body: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      time: new Date().toLocaleTimeString(),
    },
    'POST /users': {
      status: 201,
      statusText: 'Created',
      body: { id: 3, name: 'New User', email: 'new@example.com' },
      time: new Date().toLocaleTimeString(),
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004aad] to-[#cb6ce6] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">API Testing - {selectedNode?.name}</h2>
            <p className="text-white/80 text-sm">localhost:{selectedNode?.port || 8080}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex gap-6 p-6">
          {/* Request Builder */}
          <div className="flex-1 space-y-4">
            <h3 className="font-bold text-[#0b1c2c] text-sm uppercase tracking-wide">Request</h3>

            {/* Method & URL */}
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 border-2 border-[#004aad] rounded-lg font-bold text-[#004aad] bg-white"
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/endpoint"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#004aad] outline-none"
              />
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Send size={16} />
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Headers */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Headers</label>
              <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs space-y-1">
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-semibold text-[#004aad]">{key}:</span>
                    <span className="text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body */}
            {method !== 'GET' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Request Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#004aad] outline-none font-mono text-xs h-32 resize-none"
                />
              </div>
            )}
          </div>

          {/* Response */}
          <div className="flex-1 space-y-4">
            <h3 className="font-bold text-[#0b1c2c] text-sm uppercase tracking-wide">Response</h3>

            {response ? (
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#004aad] to-[#cb6ce6] text-white px-3 py-2 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold">Status Code</p>
                    <p className="text-2xl font-bold">{response.status}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{response.statusText}</p>
                    <p className="text-white/80">{response.time}</p>
                  </div>
                </div>

                {/* Response Body */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Body</label>
                    <button
                      onClick={copyResponse}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1 transition-colors text-[#004aad]"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 overflow-x-auto text-xs font-mono text-gray-800">
                    {JSON.stringify(response.body || response.error, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <p>Response will appear here after sending a request</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
