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
                  className="p-4 rounded-lg bg-gradient-to-br from-[#004aad]/10 to-[#004aad]/5 border border-[#004aad]/20"
                >
                  <p className="text-sm text-gray-600 mb-1">Services</p>
                  <p className="text-2xl font-bold text-[#004aad]">{selectedCommit.services}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#f59e0b]/10 to-[#f59e0b]/5 border border-[#f59e0b]/20"
                >
                  <p className="text-sm text-gray-600 mb-1">Databases</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">{selectedCommit.databases}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border border-[#10b981]/20"
                >
                  <p className="text-sm text-gray-600 mb-1">Files Changed</p>
                  <p className="text-2xl font-bold text-[#10b981]">12</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-[#cb6ce6]/10 to-[#cb6ce6]/5 border border-[#cb6ce6]/20"
                >
                  <p className="text-sm text-gray-600 mb-1">Diff</p>
                  <p className="text-lg font-bold text-[#cb6ce6]">{selectedCommit.changes}</p>
                </motion.div>
              </div>

              {/* Architecture Diagram */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8 p-6 rounded-xl bg-gray-50 border border-gray-200"
              >
                <h2 className="text-lg font-semibold text-[#0b1c2c] mb-4">System Architecture After Commit</h2>
                <div className="bg-white rounded-lg p-6 border border-gray-200" style={{ minHeight: '300px' }}>
                  <div className="flex items-center justify-between">
                    {/* UserService */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto rounded-lg bg-gradient-to-br from-[#004aad] to-[#004aad]/70 flex items-center justify-center text-white text-3xl mb-2">
                        ⚙️
                      </div>
                      <p className="font-semibold">UserService</p>
                      <p className="text-xs text-gray-500">Spring Boot</p>
                    </div>

                    <ArrowRight className="w-6 h-6 text-gray-400" />

                    {/* UserDB */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#f59e0b]/70 flex items-center justify-center text-white text-3xl mb-2">
                        🗄️
                      </div>
                      <p className="font-semibold">UserDB</p>
                      <p className="text-xs text-gray-500">PostgreSQL</p>
                    </div>

                    <div className="flex-1 mx-4 text-center">
                      <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />
                    </div>

                    {/* OrderService */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto rounded-lg bg-gradient-to-br from-[#004aad] to-[#004aad]/70 flex items-center justify-center text-white text-3xl mb-2">
                        ⚙️
                      </div>
                      <p className="font-semibold">OrderService</p>
                      <p className="text-xs text-gray-500">Spring Boot</p>
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
