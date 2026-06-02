'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
// ----- Sidebar icon convention -----
// • All icons are from lucide-react (consistent stroke, line-cap, and visual weight).
// • Sizes:  w-4 h-4 (16px) when sidebar is expanded
//           w-5 h-5 (20px) when collapsed, for one-glance recognition
//           w-3 h-3 (12px) for the group-header chevron (subtle)
// • Color:  no per-icon color is set — every icon inherits `currentColor`
//           from its parent <Link>, which switches between text-blue-100/70
//           (idle), text-white (active / hover), and red-on-logout. This is
//           what keeps the whole sidebar visually unified.
// • Item icons are chosen to map 1:1 to the concept of each route:
//   - LayoutDashboard → /dashboard
//   - CircleUser      → /profile (personal — visually distinct from `Users`)
//   - FlaskConical    → /research
//   - Kanban          → /workflow (the actual Kanban board)
//   - BookOpen        → /publications
//   - QrCode          → /qr-codes
//   - BrainCircuit    → /ai-insights (reads as "AI")
//   - FileBarChart    → /reports
//   - Building2       → /departments
//   - Users           → /users (plural — distinct from CircleUser)
//   - Bell            → /notifications (with red badge dot)
//   - ScrollText      → /activity-logs
//   - HardDrive       → /storage
//   - ShieldCheck     → /admin (security/authority)
//   - Settings        → /settings
//   - DatabaseBackup  → /backup (specifically the backup glyph)
//   - Globe           → /visitor (public portal)
import {
  LayoutDashboard, FlaskConical, BookOpen, Building2, FileBarChart,
  Bell, Users, QrCode, BrainCircuit, Settings, LogOut, ChevronLeft,
  ChevronRight, Kanban, ScrollText, HardDrive,
  ChevronDown, X, Globe, DatabaseBackup, CircleUser, ShieldCheck,
  // Activities group icons
  GraduationCap, UserRound, BookMarked, Presentation, Cloud,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { canManageUsers, isAdmin } from '@/lib/permissions'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS, type UserRole } from '@/types'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard',         href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Profile',        href: '/profile',   icon: CircleUser },
    ],
  },
  {
    group: 'Research',
    items: [
      { label: 'Research Database', href: '/research',     icon: FlaskConical },
      { label: 'Workflow Board',    href: '/workflow',     icon: Kanban },
      { label: 'Publications',      href: '/publications', icon: BookOpen },
      { label: 'QR / Barcode',      href: '/qr-codes',     icon: QrCode },
    ],
  },
  {
    group: 'Activities',
    items: [
      { label: 'Courses & Workshops', href: '/courses',       icon: GraduationCap },
      { label: 'Participants',        href: '/participants',  icon: UserRound },
      { label: 'Journal Club',        href: '/journal-club',  icon: BookMarked },
      { label: 'Conferences',         href: '/conferences',   icon: Presentation },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { label: 'AI Insights', href: '/ai-insights', icon: BrainCircuit },
      { label: 'Reports',     href: '/reports',     icon: FileBarChart },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'Departments',    href: '/departments',    icon: Building2 },
      // Users & Roles is super_admin-only — same rule the page itself enforces
      // and the same rule enforced server-side by the profiles RLS policies.
      { label: 'Users & Roles',  href: '/users',          icon: Users, requiresSuperAdmin: true },
      { label: 'Notifications',  href: '/notifications',  icon: Bell, badge: true },
      { label: 'Activity Logs',  href: '/activity-logs',  icon: ScrollText },
      { label: 'File Storage',   href: '/storage',        icon: HardDrive },
      { label: 'Google Drive',   href: '/google-drive',   icon: Cloud },
    ],
  },
  {
    group: 'System',
    items: [
      // Admin Panel is admin OR super_admin.
      { label: 'Admin Panel',        href: '/admin',    icon: ShieldCheck, requiresAdmin: true },
      { label: 'Settings',           href: '/settings', icon: Settings },
      { label: 'Backup Management',  href: '/backup',   icon: DatabaseBackup, requiresSuperAdmin: true },
      { label: 'Public Portal',      href: '/visitor',  icon: Globe, external: true },
    ],
  },
]

/** Drop nav entries the current role can't reach. Server-side RLS is the
 *  real boundary — this just keeps the sidebar honest. */
function visibleItems(items: typeof NAV_ITEMS[number]['items'], role?: UserRole | null) {
  return items.filter(item => {
    const it = item as { requiresSuperAdmin?: boolean; requiresAdmin?: boolean }
    if (it.requiresSuperAdmin && !canManageUsers(role)) return false
    if (it.requiresAdmin && !isAdmin(role)) return false
    return true
  })
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Main', 'Research', 'Activities', 'Analytics', 'Management', 'System'])

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    router.push('/login')
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        {/* Hospital Logo */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <img
            src="/jazan-health-cluster.jpg"
            alt="Jazan Health Cluster"
            className="w-9 h-9 object-contain"
            onError={(e) => {
              const t = e.currentTarget
              t.onerror = null
              t.src = '/hospital-logo.svg'
            }}
          />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden flex-1 min-w-0"
            >
              <p className="text-white font-bold text-sm leading-tight truncate">PMNH Research</p>
              <p className="text-blue-200/60 text-xs truncate">Jazan Portal</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={onToggle}
          className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-blue-200/60 hover:text-white hover:bg-white/10 transition-all ml-auto flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button onClick={onMobileClose}
          className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-blue-200/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-hide">
        {NAV_ITEMS.map(group => {
          const items = visibleItems(group.items, user?.role)
          if (items.length === 0) return null
          return (
          <div key={group.group}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.group)}
                className="flex items-center justify-between w-full px-3 py-1.5 mb-1"
              >
                <span className="text-blue-200/40 text-xs font-semibold uppercase tracking-widest">
                  {group.group}
                </span>
                <ChevronDown className={cn(
                  'w-3 h-3 text-blue-200/30 transition-transform',
                  expandedGroups.includes(group.group) && 'rotate-180'
                )} />
              </button>
            )}

            <AnimatePresence>
              {(collapsed || expandedGroups.includes(group.group)) && (
                <motion.div
                  initial={!collapsed ? { opacity: 0, height: 0 } : false}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={!collapsed ? { opacity: 0, height: 0 } : undefined}
                  className="space-y-0.5"
                >
                  {items.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                          isActive
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                        )}
                        <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4')} />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-sm font-medium truncate flex-1"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {!collapsed && (item as { badge?: boolean }).badge && (
                          <span className="w-2 h-2 bg-red-400 rounded-full" />
                        )}
                        {collapsed && (
                          <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {item.label}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3 p-2 rounded-xl', !collapsed && 'pr-0')}>
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-blue-700"
            style={{ background: 'rgba(255,255,255,0.9)' }}>
            {getInitials(user?.full_name || 'Admin')}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
                <p className="text-blue-200/60 text-xs truncate">{ROLE_LABELS[user?.role || 'viewer']}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-200/60 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30"
        style={{ background: 'linear-gradient(180deg, #0f2460 0%, #1e3a8a 50%, #1d4ed8 100%)' }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-[260px] z-50"
              style={{ background: 'linear-gradient(180deg, #0f2460 0%, #1e3a8a 50%, #1d4ed8 100%)' }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
