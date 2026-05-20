'use client'

import { Navbar } from '@/components/navbar'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
  Network
} from 'lucide-react'
import { useState } from 'react'

const commits = [
  {
    id: 1,
    hash: 'a1b2c3d4',
    message: '[Agent] Add PaymentService with POST /payments endpoint',
    author: 'AI Agent',
    time: '2 min ago',
    services: 3,
    databases: 2,
    changes: '+150 -30',
  },
  {
    id: 2,
    hash: 'x9y8z7w6',
    message: '[Agent] Connect OrderDB and add REST endpoints',
    author: 'AI Agent',
    time: '5 min ago',
    services: 2,
    databases: 3,
    changes: '+120 -15',
  },
  {
    id: 3,
    hash: 'p2q3r4s5',
    message: '[Manual] Initial project setup',
    author: 'Developer',
    time: '1 hour ago',
    services: 1,
    databases: 1,
    changes: '+200 -0',
  },
]

export default function GitVisualizationPage() {
  const [selectedCommit, setSelectedCommit] = useState(commits[0])

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 overflow-auto flex">
        {/* Timeline */}
        <div className="w-96 border-r border-gray-200 overflow-y-auto">
          <div className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-[#0b1c2c]">Git Timeline</h2>
            <p className="text-sm text-gray-600 mt-1">main branch</p>
          </div>

          <div className="p-6 space-y-4">
            {commits.map((commit, i) => (
              <motion.div
                key={commit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedCommit(commit)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedCommit.id === commit.id
                    ? 'border-[#004aad] bg-gradient-to-r from-[#004aad]/5 to-[#cb6ce6]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#004aad] to-[#cb6ce6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[#004aad]">{commit.hash}</p>
                    <p className="text-sm font-medium text-[#0b1c2c] mt-1 line-clamp-2">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <span>{commit.author}</span>
                      <span>•</span>
                      <span>{commit.time}</span>
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
                  <GitCommit className="w-8 h-8 text-[#004aad]" />
                  <div>
                    <h1 className="text-3xl font-bold text-[#0b1c2c]">{selectedCommit.message}</h1>
                    <p className="text-gray-600 mt-2">Commit <span className="font-mono text-[#004aad]">{selectedCommit.hash}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>By {selectedCommit.author}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedCommit.time}
                  </span>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#004aad]/10 to-[#004aad]/5 border border-[#004aad]/20 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Services</p>
                    <p className="text-2xl font-bold text-[#004aad]">{selectedCommit.services}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#004aad]/10">
                    <Server className="w-5 h-5 text-[#004aad]" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#f59e0b]/10 to-[#f59e0b]/5 border border-[#f59e0b]/20 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Databases</p>
                    <p className="text-2xl font-bold text-[#f59e0b]">{selectedCommit.databases}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#f59e0b]/10">
                    <Database className="w-5 h-5 text-[#f59e0b]" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Files Changed</p>
                    <p className="text-2xl font-bold text-[#10b981]">12</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#10b981]/10">
                    <FileCode2 className="w-5 h-5 text-[#10b981]" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#cb6ce6]/10 to-[#cb6ce6]/5 border border-[#cb6ce6]/20 flex items-start justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Diff</p>
                    <p className="text-lg font-bold text-[#cb6ce6] mt-1">{selectedCommit.changes}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#cb6ce6]/10">
                    <Code className="w-5 h-5 text-[#cb6ce6]" />
                  </div>
                </motion.div>
              </div>

              {/* Architecture Diagram */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8 p-6 rounded-xl bg-gray-50 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[#0b1c2c]">System Architecture After Commit</h2>
                  <div className="px-3 py-1 rounded-full bg-blue-100 text-[#004aad] text-xs font-semibold">
                    Live View
                  </div>
                </div>
                
                <div className="relative bg-white rounded-xl p-8 border border-gray-200 shadow-inner overflow-hidden" style={{ minHeight: '340px' }}>
                  {/* Background grid pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                  
                  <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 h-full z-10 w-full pt-4">
                    
                    {/* API Gateway */}
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 border border-indigo-400/30 flex items-center justify-center shadow-lg mb-3 shadow-indigo-500/20">
                        <Network className="w-8 h-8 text-white" />
                      </div>
                      <p className="font-semibold text-[#0b1c2c] text-sm">API Gateway</p>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-mono mt-1">Nginx</span>
                    </motion.div>

                    {/* Connecting Lines */}
                    <div className="hidden md:flex flex-col gap-12 text-gray-300">
                       <svg width="40" height="120" viewBox="0 0 40 120" className="opacity-60">
                         <path d="M0 60 L20 60 L20 10 L40 10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                         <path d="M0 60 L20 60 L20 110 L40 110" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                       </svg>
                    </div>
                    
                    {/* Services Column */}
                    <div className="flex flex-col gap-10">
                      {/* UserService */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center group relative"
                      >
                         <div className="absolute -inset-2 bg-blue-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-20 h-20 relative rounded-2xl bg-gradient-to-br from-[#004aad] to-[#004aad]/80 border border-[#004aad]/20 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20 z-10">
                          <Server className="w-9 h-9 text-white" />
                        </div>
                        <p className="font-semibold text-[#0b1c2c]">UserService</p>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-xs text-[#004aad] font-mono mt-1">Spring Boot</span>
                      </motion.div>

                      {/* OrderService */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center group relative cursor-pointer"
                      >
                         <div className="absolute -inset-2 bg-emerald-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity flex"></div>
                         {/* Highlight pulse since it's changed */}
                         <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping z-20"></div>
                         <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full z-20"></div>

                        <div className="w-20 h-20 relative rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 border border-emerald-400/20 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 z-10">
                          <Server className="w-9 h-9 text-white" />
                        </div>
                        <p className="font-semibold text-[#0b1c2c]">OrderService</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-600 font-mono mt-1">Go + gRPC</span>
                      </motion.div>
                    </div>

                    {/* Connecting Lines */}
                    <div className="hidden md:flex flex-col gap-10">
                       <div className="flex items-center text-gray-300 h-24">
                          <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
                             <line x1="0" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                             <polygon points="35,5 40,10 35,15" fill="currentColor" />
                          </svg>
                       </div>
                       <div className="flex items-center text-gray-300 h-24">
                          <svg width="40" height="20" viewBox="0 0 40 20" className="opacity-60">
                             <line x1="0" y1="10" x2="40" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                             <polygon points="35,5 40,10 35,15" fill="currentColor" />
                          </svg>
                       </div>
                    </div>

                    {/* Databases Column */}
                    <div className="flex flex-col gap-10">
                      {/* UserDB */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#f59e0b] to-amber-400 border border-amber-300/30 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                          <Database className="w-8 h-8 text-white" />
                        </div>
                        <p className="font-semibold text-[#0b1c2c] text-sm">UserDB</p>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[10px] text-amber-600 font-mono mt-1">PostgreSQL</span>
                      </motion.div>

                      {/* OrderDB */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-rose-400 border border-rose-300/30 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
                          <Database className="w-8 h-8 text-white" />
                        </div>
                        <p className="font-semibold text-[#0b1c2c] text-sm">OrderDB</p>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] text-rose-600 font-mono mt-1">MongoDB</span>
                      </motion.div>
                    </div>

                  </div>
                </div>
              </motion.div>

              {/* Code Diff */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 rounded-xl bg-[#0b1c2c] text-white font-mono text-sm"
              >
                <h2 className="text-lg font-semibold mb-4">Changes</h2>
                <div className="space-y-1">
                  <div className="text-green-400">+ Created PaymentService folder</div>
                  <div className="text-green-400">+ Added PaymentController.java</div>
                  <div className="text-green-400">+ Added application.properties</div>
                  <div className="text-green-400">+ Added PaymentRepository interface</div>
                  <div className="text-red-400">- Removed legacy payment handler</div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
