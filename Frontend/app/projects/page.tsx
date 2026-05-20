'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FolderOpen, Zap, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

// Generate 25 mock projects for pagination demonstration
const allProjectsData = Array.from({ length: 25 }, (_, i) => ({
  id: `project-${i + 1}`,
  name: `System Project ${i + 1}`,
  description: `Architecture and microservices definition for project ${i + 1}.`,
  services: Math.floor(Math.random() * 12) + 1,
  lastUpdate: `${Math.floor(Math.random() * 24) + 1} hours ago`,
  status: i % 5 === 0 ? 'inactive' : 'active'
}))

export default function ProjectsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const totalPages = Math.ceil(allProjectsData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentProjects = allProjectsData.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#0b1c2c] mb-2">All Projects</h1>
              <p className="text-gray-600">Manage and view all your system architecture projects.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % itemsPerPage) * 0.05 }}
              >
                <Link href={`/${project.id}`}>
                  <div className="group p-6 rounded-xl bg-white border border-gray-200 hover:border-[#004aad] hover:shadow-lg transition-all cursor-pointer h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <FolderOpen className="w-8 h-8 text-[#004aad]" />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {project.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#0b1c2c] text-lg mb-2">{project.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">{project.description}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-[#cb6ce6]" /> {project.services} Services</span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Updated {project.lastUpdate}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#004aad] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="text-[#0b1c2c]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="text-sm font-medium text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="text-[#0b1c2c]"
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