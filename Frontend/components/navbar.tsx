'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Bell, 
  GitBranch, 
  Settings,
  Search,
  ChevronDown,
  Database,
  Code2
} from 'lucide-react'

export function Navbar() {
  const [project, setProject] = useState('My First System')

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        {/* Logo - Bigger */}
        <div className="flex items-center gap-2 min-w-fit">
          <div className="relative w-48 h-12">
            <Image 
              src="/logo.png" 
              alt="CodeEvo" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
          <Code2 className="w-4 h-4 text-[#004aad]" />
          <span className="text-sm font-medium text-gray-700">{project}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search nodes, endpoints..."
              className="pl-10 h-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Git Branch */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <GitBranch className="w-4 h-4 text-[#004aad]" />
          <span>main</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Bell className="w-5 h-5 text-[#0b1c2c]" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Database className="w-5 h-5 text-[#0b1c2c]" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Settings className="w-5 h-5 text-[#0b1c2c]" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
