'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  GitBranch, 
  Settings,
  Search,
  ChevronDown,
  Code2,
  Globe,
  Play,
  Cloud,
} from 'lucide-react'

export function Navbar() {
  const [project, setProject] = useState('My First System')

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-14 px-4 gap-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 min-w-fit pr-3">
          <div className="relative w-36 h-10">
            <Image 
              src="/logo.png" 
              alt="CodeEvo" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Project Selector */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer hover:bg-white/[0.08] hover:border-white/[0.1] transition-all duration-200 group">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center">
            <Code2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">{project}</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        </button>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-sm mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              placeholder="Search nodes, endpoints..."
              className="w-full pl-9 pr-4 h-9 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[13px] text-white/80 placeholder:text-white/20 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all duration-200"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono">⌘K</kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Deploy Button */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all duration-200">
            <Cloud className="w-3.5 h-3.5" />
            Deploy
          </button>

          {/* Git Branch */}
          <Link href="/git" className="hidden md:flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.04] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400/60" />
            <span className="font-medium">main</span>
          </Link>

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200 relative">
            <Bell className="w-4 h-4" />
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200">
            <Settings className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-[11px] font-bold ml-1 cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200">
            M
          </div>
        </div>
      </div>
    </nav>
  )
}
