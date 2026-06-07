'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Settings,
  Search,
  LogOut,
  User,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { NotificationsPopover } from '@/components/notifications-popover'
import { useAuthStore } from '@/lib/auth-store'
import { authApi, userApi } from '@/lib/api'

export function Navbar() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  // Derive display values from store
  const initials = user
    ? user.firstName.charAt(0).toUpperCase()
    : '?'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest'
  const email = user?.email ?? ''
  const avatarUrl = user?.avatar ? userApi.avatarUrl(user.avatar) : null

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // Best-effort; clear local state regardless
    } finally {
      clearAuth()
      router.replace('/auth')
    }
  }

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

          {/* Settings icon */}
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200">
              <Settings className="w-4 h-4" />
            </button>
          </Link>

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-[11px] font-bold ml-1 cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200 outline-none ring-0 focus-visible:ring-2 focus-visible:ring-purple-500/50">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 p-1.5 border border-white/[0.08] bg-[#0d1220]/95 backdrop-blur-xl shadow-xl shadow-black/50 rounded-xl"
            >
              <div className="flex items-center gap-3 px-2 py-2.5">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-[#6c3bf5] to-[#c74cf0] flex items-center justify-center text-white text-[13px] font-bold shadow-lg shadow-purple-500/20 shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                  <p className="text-xs text-white/40 truncate">{email}</p>
                </div>
              </div>

              <div className="h-[1px] bg-white/[0.04] my-1 mx-1" />

              <DropdownMenuItem asChild className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white outline-none focus:bg-white/[0.04] focus:text-white">
                <Link href="/settings?tab=profile" className="w-full">
                  <User className="w-4 h-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>

              <div className="h-[1px] bg-white/[0.04] my-1 mx-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                disabled={loggingOut}
                className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-2 text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400 outline-none focus:bg-red-500/10 focus:text-red-400 disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
