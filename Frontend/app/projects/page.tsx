'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FolderOpen, Zap, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { projectApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function ProjectsPage() {
  const [allProjectsData, setAllProjectsData] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9
  
  useEffect(() => {
    projectApi.listProjects()
      .then(data => {
        setAllProjectsData(data.content || [])
      })
      .catch(console.error)
  }, [])

  const totalPages = Math.ceil(allProjectsData.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentProjects = allProjectsData.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e1a] text-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">All Projects</h1>
              <p className="text-white/60">Manage and view all your system architecture projects.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentProjects.length === 0 ? (
              <div className="col-span-full py-12 text-center text-white/40 border border-white/[0.06] rounded-xl bg-[#0d1220]/50 border-dashed">
                No projects found. Create your first project to see it here!
              </div>
            ) : (
              currentProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % itemsPerPage) * 0.05 }}
                >
                  <Link href={`/${project.id}`}>
                    <div className="group p-6 rounded-xl bg-[#0d1220] border border-white/[0.06] hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <FolderOpen className="w-8 h-8 text-purple-400" />
                          <span className={`px-2 py-1 text-[11px] font-semibold rounded-full ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/[0.04] text-white/40'}`}>
                            {project.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">{project.name}</h3>
                        <p className="text-sm text-white/40 mb-4">{project.description || 'No description provided.'}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-[#cb6ce6]" /> {project.serviceCount ?? 0} Services</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                          <span className="text-[11px] font-medium text-white/30">
                            UPDATED {project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }).toUpperCase() : 'JUST NOW'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8 border-t border-white/[0.06]">
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-transparent text-white border-white/[0.1] hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="text-[13px] font-medium text-white/50">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-transparent text-white border-white/[0.1] hover:bg-white/[0.06] hover:text-white"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}