'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { CheckCircle2, AlertCircle, Info, Zap, Settings2 } from 'lucide-react'
import { MOCK_NOTIFICATIONS } from '@/components/notifications-popover'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

// Combine the mock data multiple times to show pagination, adding index to avoid duplicate IDs
const ALL_NOTIFICATIONS = Array(15).fill(MOCK_NOTIFICATIONS).flat().map((n, i) => ({
  ...n,
  id: `${n.id}-${i}`,
  time: i < 4 ? n.time : `${Math.floor(i / 4) + 1} days ago`
}))

const ITEMS_PER_PAGE = 8

export default function NotificationsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(ALL_NOTIFICATIONS.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentNotifications = ALL_NOTIFICATIONS.slice(startIndex, endIndex)

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] text-white overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
              <p className="text-sm text-white/50 mt-1">Manage your system alerts, messages, and updates.</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all">
              <Settings2 className="w-4 h-4" />
              Notification Settings
            </button>
          </div>

          <div className="bg-[#0d1220]/60 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="flex flex-col">
              {currentNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`flex items-start gap-4 p-5 py-5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors ${!notification.read ? 'bg-white/[0.01]' : ''}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {notification.type === 'success' && (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    {notification.type === 'error' && (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    {notification.type === 'info' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Info className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    {notification.type === 'feature' && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-base font-medium ${!notification.read ? 'text-white' : 'text-white/80'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-white/50 mt-1 leading-relaxed max-w-2xl">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-white/30 whitespace-nowrap">
                        {notification.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/[0.04] bg-[#0d1220]">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      // Simple pagination logic to show limited pages
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink 
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer bg-transparent border-0 hover:bg-white/[0.04] text-white/70"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      // Show ellipsis
                      if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.max(1, Math.min(totalPages, p + 1)))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}