import { Bell, CheckCircle2, AlertCircle, Info, Zap } from 'lucide-react'
import Link from 'next/link'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Architecture Exported',
    message: 'Your system architecture "My First System" has been exported successfully.',
    time: '2 mins ago',
    type: 'success',
    read: false,
  },
  {
    id: 2,
    title: 'Agent Analysis Complete',
    message: 'The AI agent has finished analyzing your UserService endpoints.',
    time: '1 hour ago',
    type: 'info',
    read: false,
  },
  {
    id: 3,
    title: 'Connection Error',
    message: 'Failed to establish connection between PaymentService and EventBus.',
    time: '3 hours ago',
    type: 'error',
    read: true,
  },
  {
    id: 4,
    title: 'New Feature Available',
    message: 'API Testing module is now active. Try testing your REST endpoints directly.',
    time: '1 day ago',
    type: 'feature',
    read: true,
  },
]

export function NotificationsPopover() {
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200 relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0 border border-white/[0.08] bg-[#0d1220]/95 backdrop-blur-xl shadow-xl shadow-black/50"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
          <h3 className="font-semibold text-sm text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-medium px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        
        <ScrollArea className="h-80">
          <div className="flex flex-col">
            {MOCK_NOTIFICATIONS.map((notification) => (
              <div 
                key={notification.id}
                className={`flex gap-3 px-4 py-3 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors cursor-default ${!notification.read ? 'bg-white/[0.01]' : ''}`}
              >
                <div className="mt-0.5 shrink-0">
                  {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {notification.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
                  {notification.type === 'feature' && <Zap className="w-4 h-4 text-purple-400" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-white/70'}`}>
                      {notification.title}
                    </p>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-white/30 mt-1">
                    {notification.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-white/[0.04] bg-white/[0.01]">
          <Link 
            href="/notifications" 
            className="block text-center text-xs font-medium text-white/60 hover:text-purple-400 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}