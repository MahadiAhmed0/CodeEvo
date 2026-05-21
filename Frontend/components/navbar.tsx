'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  GitBranch, 
  Settings,
  Search,
  ChevronDown,
  CodeXml,
  Globe,
  Play,
  Cloud,
} from 'lucide-react'

import { NotificationsPopover } from '@/components/notifications-popover'

export function Navbar() {
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
          <NotificationsPopover />
          
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200">
              <Settings className="w-4 h-4" />
            </button>
          </Link>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-[11px] font-bold ml-1 cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200">
            M
          </div>
        </div>
      </div>
    </nav>
  )
}
