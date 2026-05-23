'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, User, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'

interface TopBarProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export function TopBar({ onMenuClick, sidebarCollapsed }: TopBarProps) {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const unreadCount = DEMO_NOTIFICATIONS.filter(n => !n.is_read).length

  const handleLogout = () => {
    setShowProfile(false)
    logout()
    toast.success('Signed out successfully')
    router.push('/login')
  }

  return (
    <header className="fixed top-0 right-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-sm"
      style={{ left: 0, paddingLeft: sidebarCollapsed ? 72 : 260, transition: 'padding-left 0.25s ease' }}>
      <div className="flex items-center justify-between px-5 h-16">
        {/* Left: Menu + Hospital name */}
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-3">
            <img
              src="/jazan-health-cluster.jpg"
              alt="Jazan Health Cluster"
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
            />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Health & Nursing Research Unit</p>
              <p className="text-xs text-gray-400">Prince Mohammed Bin Nasser Hospital · Jazan, KSA</p>
            </div>
          </div>
        </div>

        {/* Right: Search, Bell, Profile */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search research, investigators..."
              className="pl-9 pr-4 py-2 w-64 bg-gray-100 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
            />
          </div>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {DEMO_NOTIFICATIONS.slice(0, 5).map(n => (
                      <div key={n.id}
                        className={cn('flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer', !n.is_read && 'bg-blue-50/50')}>
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs',
                          n.type === 'delay' && 'bg-orange-100 text-orange-600',
                          n.type === 'approval' && 'bg-yellow-100 text-yellow-600',
                          n.type === 'publication' && 'bg-green-100 text-green-600',
                          n.type === 'deadline' && 'bg-red-100 text-red-600',
                          n.type === 'qr_submission' && 'bg-purple-100 text-purple-600',
                        )}>
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold text-gray-900 truncate', !n.is_read && 'text-blue-900')}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                    ))}
                  </div>
                  <Link href="/notifications" onClick={() => setShowNotifications(false)}
                    className="flex items-center justify-center py-3 text-sm text-blue-600 font-semibold hover:bg-gray-50 transition-colors">
                    View all notifications
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                {getInitials(user?.full_name || 'Admin')}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.full_name?.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[user?.role || 'viewer']}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">{user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="inline-flex mt-1.5 items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {ROLE_LABELS[user?.role || 'viewer']}
                    </span>
                  </div>
                  {[
                    { icon: User, label: 'My Profile', href: '/settings?tab=profile' },
                    { icon: Settings, label: 'Settings', href: '/settings' },
                    { icon: Shield, label: 'Security', href: '/settings?tab=security' },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setShowProfile(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
