'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Save, Key, AppWindow, Settings } from 'lucide-react'
import { useDiagramStore } from '@/lib/store'

export function ProjectSettingsModal() {
  const { showProjectSettings, setShowProjectSettings, projectSettings, setProjectSettings } = useDiagramStore()
  const [activeTab, setActiveTab] = useState<'env' | 'ai'>('env')

  // Local state for editing
  const [envVars, setEnvVars] = useState(
    Object.entries(projectSettings.environmentVariables).map(([key, value]) => ({ key, value }))
  )
  const [apiKeys, setApiKeys] = useState({ ...projectSettings.aiApiKeys })

  if (!showProjectSettings) return null

  const handleSave = () => {
    const newEnvVars: Record<string, string> = {}
    envVars.forEach(({ key, value }) => {
      if (key.trim()) {
        newEnvVars[key.trim()] = value
      }
    })

    setProjectSettings({
      environmentVariables: newEnvVars,
      aiApiKeys: apiKeys,
    })
    setShowProjectSettings(false)
  }

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }])
  
  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const newVars = [...envVars]
    newVars[index][field] = val
    setEnvVars(newVars)
  }

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[#0a0e1a] border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d1220]">
          <div className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Project Settings</h2>
          </div>
          <button
            onClick={() => setShowProjectSettings(false)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-white/[0.06] bg-[#0d1220]/50 p-4">
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('env')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'env'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
              >
                <AppWindow className="w-4 h-4" />
                Environment
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
              >
                <Key className="w-4 h-4" />
                AI Providers
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 bg-[#06080d] overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'env' && (
                <motion.div
                  key="env"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-1">Environment Variables</h3>
                    <p className="text-xs text-white/40">These variables will be injected into generated code and during sandbox executions.</p>
                  </div>

                  <div className="space-y-2">
                    {envVars.map((env, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <input
                          value={env.key}
                          onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                          placeholder="KEY"
                          className="w-1/3 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 focus:border-purple-500/30 focus:bg-white/[0.06] outline-none transition-colors"
                        />
                        <span className="text-white/20">=</span>
                        <input
                          value={env.value}
                          onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 focus:border-purple-500/30 focus:bg-white/[0.06] outline-none transition-colors font-mono"
                        />
                        <button
                          onClick={() => removeEnvVar(i)}
                          className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addEnvVar}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-4 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Variable
                  </button>
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">AI Provider Keys</h3>
                    <p className="text-xs text-white/40">Provide your own API keys. These are stored locally and sent securely to backend endpoints for AI processing.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'openai', name: 'OpenAI API Key', placeholder: 'sk-...' },
                      { id: 'anthropic', name: 'Anthropic API Key', placeholder: 'sk-ant-...' },
                      { id: 'gemini', name: 'Gemini API Key', placeholder: 'AIza...' },
                      { id: 'groq', name: 'Groq API Key', placeholder: 'gsk_...' },
                    ].map(provider => (
                      <div key={provider.id}>
                        <label className="block text-[11px] font-medium text-white/60 mb-1.5">{provider.name}</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={apiKeys[provider.id as keyof typeof apiKeys] || ''}
                            onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                            placeholder={provider.placeholder}
                            className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white/80 focus:border-purple-500/30 focus:bg-white/[0.06] outline-none transition-colors"
                          />
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.06] bg-[#0d1220] gap-3">
          <button
            onClick={() => setShowProjectSettings(false)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6c3bf5] to-[#c74cf0] hover:shadow-[0_0_15px_rgba(108,59,245,0.4)] text-white rounded-lg text-[13px] font-semibold transition-all"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  )
}
