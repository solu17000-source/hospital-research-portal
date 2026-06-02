'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Trash2, Filter, AlertTriangle, Clock, BookOpen, QrCode, Shield, Activity, X } from 'lucide-react'
import { useNotifications } from '@/lib/data-source'
import type { Notification } from '@/types'
import { cn, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

const TYPE_ICONS: Record<string, React.ElementType> = {
  delay: AlertTriangle,
  deadline: Clock,
  approval: Shield,
  publication: BookOpen,
  qr_submission: QrCode,
  system: Activity,
  missing_document: X,
  stage_change: Activity,
  assignment: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  delay: 'bg-orange-100 text-orange-600',
  deadline: 'bg-red-100 text-red-600',
  approval: 'bg-yellow-100 text-yellow-700',
  publication: 'bg-green-100 text-green-600',
  qr_submission: 'bg-purple-100 text-purple-600',
  system: 'bg-blue-100 text-blue-600',
  missing_document: 'bg-gray-100 text-gray-600',
  stage_change: 'bg-cyan-100 text-cyan-600',
  assignment: 'bg-indigo-100 text-indigo-600',
}

export default function NotificationsPage() {
  // Live notifications from Supabase. Local state mirrors the server list
  // so we can optimistically flip read/unread without a re-fetch.
  const { data: liveNotifications } = useNotifications(undefined, 100)
  const [notifications, setNotifications] = useState<Notification[]>([])
  useEffect(() => {
    if (liveNotifications) setNotifications(liveNotifications)
  }, [liveNotifications])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read' && !n.is_read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markRead = (id: string) => {
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true, read_at: new Date().toISOString() } : notif))
  }

  const markAllRead = () => {
    setNotifications(n => n.map(notif => ({ ...notif, is_read: true, read_at: new Date().toISOString() })))
    toast.success('All notifications marked as read')
  }

  const deleteNotification = (id: string) => {
    setNotifications(n => n.filter(notif => notif.id !== id))
    toast.success('Notification deleted')
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
          </h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3">
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 text-sm font-medium capitalize transition-colors',
                filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="form-input w-auto text-sm">
          <option value="all">All Types</option>
          <option value="delay">Delay Alerts</option>
          <option value="deadline">Deadline</option>
          <option value="approval">Approval</option>
          <option value="publication">Publication</option>
          <option value="qr_submission">QR Submission</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            filtered.map((n, i) => {
              const Icon = TYPE_ICONS[n.type] || Bell
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn('premium-card p-4 flex gap-4 items-start cursor-pointer transition-all hover:shadow-card-hover',
                    !n.is_read && 'bg-blue-50/40 border-blue-100'
                  )}
                  onClick={() => markRead(n.id)}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-500')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('font-semibold text-sm', !n.is_read ? 'text-blue-900' : 'text-gray-900')}>{n.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        <button onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                      <span className={cn('badge text-xs capitalize',
                        n.priority === 'high' && 'bg-red-100 text-red-700 border-red-200',
                        n.priority === 'medium' && 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        n.priority === 'normal' && 'bg-gray-100 text-gray-600 border-gray-200',
                      )}>
                        {n.priority} priority
                      </span>
                      {n.action_url && (
                        <Link href={n.action_url} onClick={e => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline">
                          View details →
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
