'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, Bell, BookOpen, Building2,
  CheckCircle, Cloud, Database, Eye, FileBarChart, FlaskConical, Globe,
  HardDrive, Key, Languages, Lock, ScrollText, Settings, Shield,
  ShieldCheck, Sparkles, UserPlus, Users, Wrench,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import {
  useActivityLogs, useDepartments, useNotifications, useStats, useUsers,
} from '@/lib/data-source'
import { cn, timeAgo } from '@/lib/utils'
import { ROLE_LABELS, type UserRole } from '@/types'

type Lang = 'en' | 'ar'

const T = {
  en: {
    pageTitle: 'Admin Panel',
    pageSub: 'Manage users, roles, permissions, security, content visibility, and system health.',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — connect Supabase for live administration',
    accessDenied: 'Admin access only',
    accessDeniedSub: 'You do not have permission to view the Admin Panel. Contact your Super Admin if you believe this is a mistake.',
    yourRole: 'Your role',
    welcomeBack: 'Welcome back, {name}',
    welcomeSub: 'Pick a module below to administer the platform.',
    statUsers: 'Active users',
    statResearch: 'Research projects',
    statPendingApproval: 'Pending approvals',
    statDelayed: 'Delayed projects',
    moduleUsersTitle: 'User Management',
    moduleUsersSub: 'Add, edit, suspend, reset passwords, assign roles and departments.',
    moduleRolesTitle: 'Roles & Permissions',
    moduleRolesSub: 'Review what each role can do across the platform.',
    moduleDeptsTitle: 'Departments',
    moduleDeptsSub: 'Manage hospital departments and their assigned heads.',
    moduleSettingsTitle: 'System Settings',
    moduleSettingsSub: 'Security, session timeout, hospital info, public-portal toggles.',
    moduleAuditTitle: 'Activity & Audit Logs',
    moduleAuditSub: 'Full audit trail of who did what and when across the platform.',
    moduleBackupTitle: 'Backup & Restore',
    moduleBackupSub: 'Schedule backups, view history, run restore drills.',
    moduleNotifTitle: 'Notifications Centre',
    moduleNotifSub: 'Broadcast announcements and review the notification queue.',
    moduleStorageTitle: 'File Storage',
    moduleStorageSub: 'Audit uploaded files and manage storage limits.',
    moduleVisitorTitle: 'Public / Visitor Portal',
    moduleVisitorSub: 'Choose which research records are visible to the public.',
    openModule: 'Open',
    recentActivity: 'Recent admin activity',
    seeAllLogs: 'See all logs',
    healthTitle: 'Platform health',
    health2fa: 'Two-factor authentication',
    healthBackup: 'Last backup',
    healthSync: 'Google Drive sync',
    healthDb: 'Database',
    healthStatusActive: 'Active',
    healthStatusInactive: 'Inactive',
    healthStatusHealthy: 'Healthy',
    healthStatusDemo: 'Demo mode',
    quickActions: 'Quick actions',
    quickAddUser: 'Add new user',
    quickResetPw: 'Reset a password',
    quickInviteAdmin: 'Invite an admin',
    rolesPermsTitle: 'What each role can do',
    rolesPermsSub: 'High-level overview of role capabilities. Edit role assignments in User Management.',
    permsTableRole: 'Role',
    permsAdmin: 'Admin / User mgmt',
    permsResearch: 'Research CRUD',
    permsApprovals: 'Approvals',
    permsReports: 'Reports & exports',
    permsConfidential: 'Confidential files',
    permsPublic: 'Public dashboard only',
  },
  ar: {
    pageTitle: 'لوحة المسؤول',
    pageSub: 'إدارة المستخدمين والأدوار والصلاحيات والأمان وظهور المحتوى وحالة النظام.',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — قم بربط Supabase للإدارة الحقيقية',
    accessDenied: 'الوصول للمسؤولين فقط',
    accessDeniedSub: 'ليس لديك صلاحية لعرض لوحة المسؤول. تواصل مع المسؤول الرئيسي إن كان هذا غير مقصود.',
    yourRole: 'دورك',
    welcomeBack: 'مرحبًا بعودتك، {name}',
    welcomeSub: 'اختر وحدة للبدء.',
    statUsers: 'مستخدمون نشطون',
    statResearch: 'مشاريع بحثية',
    statPendingApproval: 'موافقات معلقة',
    statDelayed: 'مشاريع متأخرة',
    moduleUsersTitle: 'إدارة المستخدمين',
    moduleUsersSub: 'إضافة، تعديل، تعليق، إعادة تعيين كلمة المرور، تعيين الأدوار والأقسام.',
    moduleRolesTitle: 'الأدوار والصلاحيات',
    moduleRolesSub: 'مراجعة قدرات كل دور على المنصة.',
    moduleDeptsTitle: 'الأقسام',
    moduleDeptsSub: 'إدارة أقسام المستشفى والمسؤولين عنها.',
    moduleSettingsTitle: 'إعدادات النظام',
    moduleSettingsSub: 'الأمان، انتهاء الجلسة، بيانات المستشفى، إعدادات البوابة العامة.',
    moduleAuditTitle: 'سجلات النشاط والتدقيق',
    moduleAuditSub: 'سجل تدقيق كامل لجميع الإجراءات على المنصة.',
    moduleBackupTitle: 'النسخ الاحتياطي',
    moduleBackupSub: 'جدولة النسخ، سجل النسخ، تجارب الاستعادة.',
    moduleNotifTitle: 'مركز الإشعارات',
    moduleNotifSub: 'إرسال إعلانات ومراجعة قائمة الإشعارات.',
    moduleStorageTitle: 'تخزين الملفات',
    moduleStorageSub: 'مراجعة الملفات المرفوعة وإدارة حدود التخزين.',
    moduleVisitorTitle: 'البوابة العامة',
    moduleVisitorSub: 'اختر الأبحاث الظاهرة للعموم.',
    openModule: 'فتح',
    recentActivity: 'أحدث نشاط إداري',
    seeAllLogs: 'كل السجلات',
    healthTitle: 'حالة النظام',
    health2fa: 'المصادقة الثنائية',
    healthBackup: 'آخر نسخة احتياطية',
    healthSync: 'مزامنة Google Drive',
    healthDb: 'قاعدة البيانات',
    healthStatusActive: 'نشطة',
    healthStatusInactive: 'غير نشطة',
    healthStatusHealthy: 'سليمة',
    healthStatusDemo: 'وضع تجريبي',
    quickActions: 'إجراءات سريعة',
    quickAddUser: 'إضافة مستخدم',
    quickResetPw: 'إعادة تعيين كلمة مرور',
    quickInviteAdmin: 'دعوة مسؤول',
    rolesPermsTitle: 'صلاحيات كل دور',
    rolesPermsSub: 'نظرة سريعة على ما يمكن لكل دور فعله. عدّل الأدوار من إدارة المستخدمين.',
    permsTableRole: 'الدور',
    permsAdmin: 'إدارة المسؤولين',
    permsResearch: 'إضافة وتعديل الأبحاث',
    permsApprovals: 'الموافقات',
    permsReports: 'التقارير والتصدير',
    permsConfidential: 'ملفات سرية',
    permsPublic: 'لوحة العموم فقط',
  },
} as const

type Translations = { [K in keyof (typeof T)['en']]: string }

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}
function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// Role → permission matrix used by the "What each role can do" card.
const ROLE_PERMS: Record<UserRole, {
  admin: boolean; research: boolean; approvals: boolean; reports: boolean; confidential: boolean; publicOnly: boolean
}> = {
  super_admin:           { admin: true,  research: true,  approvals: true,  reports: true,  confidential: true,  publicOnly: false },
  admin:                 { admin: true,  research: true,  approvals: true,  reports: true,  confidential: true,  publicOnly: false },
  research_director:     { admin: false, research: true,  approvals: true,  reports: true,  confidential: true,  publicOnly: false },
  department_head:       { admin: false, research: true,  approvals: true,  reports: true,  confidential: true,  publicOnly: false },
  research_coordinator:  { admin: false, research: true,  approvals: false, reports: true,  confidential: true,  publicOnly: false },
  authorized_staff:      { admin: false, research: true,  approvals: false, reports: false, confidential: false, publicOnly: false },
  viewer:                { admin: false, research: false, approvals: false, reports: false, confidential: false, publicOnly: true  },
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang] as Translations
  const isRtl = lang === 'ar'

  const role = user?.role
  const isAdmin = role === 'admin' || role === 'super_admin'

  // Live Supabase data — replaces every former DEMO_* read.
  const { data: liveStats } = useStats()
  const { data: usersData } = useUsers()
  const { data: deptsData } = useDepartments()
  const { data: notifsData } = useNotifications(undefined, 50)
  const { data: logsData } = useActivityLogs(100)

  const liveUsers = usersData ?? []
  const liveDepts = deptsData ?? []
  const liveNotifs = notifsData ?? []
  const liveLogs = logsData ?? []
  const stat = liveStats ?? {
    total_projects: 0, active_projects: 0, completed_projects: 0,
    published_papers: 0, delayed_projects: 0, pending_irb: 0,
    upcoming_deadlines: 0, total_departments: 0, total_users: 0,
    this_month_new: 0, funded_projects: 0, total_budget: 0,
    q1_publications: 0, q2_publications: 0, q3_publications: 0,
    q4_publications: 0, open_access_count: 0,
  }

  // Admin activity feed — last few admin-relevant log entries from Supabase.
  const adminFeed = useMemo(
    () =>
      liveLogs.filter(l =>
        ['login', 'create', 'update', 'permission_change', 'role_change', 'reset_password'].includes(l.action),
      ).slice(0, 6),
    [liveLogs],
  )

  const stats = {
    users: liveUsers.filter(u => u.is_active).length,
    research: stat.total_projects,
    pending: stat.pending_irb,
    delayed: stat.delayed_projects,
  }

  if (!user) return null

  // -------- Access denied --------
  if (!isAdmin) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-[60vh] flex items-center justify-center">
        <div className="premium-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-gray-900">{t.accessDenied}</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{t.accessDeniedSub}</p>
          <p className="mt-4 text-xs text-gray-400">
            {t.yourRole}: <span className="font-semibold text-gray-700">{ROLE_LABELS[user.role]}</span>
          </p>
          <Link href="/dashboard" className="btn-primary text-sm mt-6">
            <ArrowRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const modules: {
    href: string
    titleKey: keyof Translations
    subKey: keyof Translations
    icon: React.ComponentType<{ className?: string }>
    color: string
    count?: number
  }[] = [
    { href: '/users',          titleKey: 'moduleUsersTitle',    subKey: 'moduleUsersSub',    icon: Users,        color: '#2563eb', count: liveUsers.length },
    { href: '/admin#roles',    titleKey: 'moduleRolesTitle',    subKey: 'moduleRolesSub',    icon: Shield,       color: '#7c3aed' },
    { href: '/departments',    titleKey: 'moduleDeptsTitle',    subKey: 'moduleDeptsSub',    icon: Building2,    color: '#0d9488', count: liveDepts.length },
    { href: '/settings',       titleKey: 'moduleSettingsTitle', subKey: 'moduleSettingsSub', icon: Settings,     color: '#475569' },
    { href: '/activity-logs',  titleKey: 'moduleAuditTitle',    subKey: 'moduleAuditSub',    icon: ScrollText,   color: '#db2777' },
    { href: '/backup',         titleKey: 'moduleBackupTitle',   subKey: 'moduleBackupSub',   icon: Database,     color: '#0891b2' },
    { href: '/notifications',  titleKey: 'moduleNotifTitle',    subKey: 'moduleNotifSub',    icon: Bell,         color: '#f59e0b', count: liveNotifs.length },
    { href: '/storage',        titleKey: 'moduleStorageTitle',  subKey: 'moduleStorageSub',  icon: HardDrive,    color: '#16a34a' },
    { href: '/visitor',        titleKey: 'moduleVisitorTitle',  subKey: 'moduleVisitorSub',  icon: Globe,        color: '#0ea5e9' },
  ]

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6">

      {/* ===== Banner ===== */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl text-white p-6 md:p-7"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f2460 45%, #1e3a8a 100%)' }}
      >
        <div className="home-hero-grid absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-blue-200/85 text-xs font-bold uppercase tracking-[0.18em]">
                {ROLE_LABELS[user.role]}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">
                {format(t.welcomeBack, { name: (user.full_name || '').split(' ')[0] })}
              </h1>
              <p className="text-blue-100/80 text-sm mt-1 max-w-xl">{t.welcomeSub}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors backdrop-blur"
            >
              <Languages className="w-4 h-4" />
              {t.languageBtn}
            </button>
            <Link
              href="/users"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-white text-blue-800 hover:bg-blue-50 transition-colors shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              {t.quickAddUser}
            </Link>
          </div>
        </div>
        <p className="relative mt-4 flex items-center gap-1.5 text-[11px] text-blue-200/80">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
          {t.liveData}
        </p>
      </motion.div>

      {/* ===== KPI Strip ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statUsers,            value: stats.users,    icon: Users,        color: 'blue'   },
          { label: t.statResearch,         value: stats.research, icon: FlaskConical, color: 'purple' },
          { label: t.statPendingApproval,  value: stats.pending,  icon: Shield,       color: 'amber'  },
          { label: t.statDelayed,          value: stats.delayed,  icon: AlertTriangle,color: 'red'    },
        ].map(s => (
          <div
            key={s.label}
            className={cn(
              'premium-card p-4 flex items-center gap-3',
              s.color === 'blue'   && (isRtl ? 'border-r-4 border-r-blue-500'   : 'border-l-4 border-l-blue-500'),
              s.color === 'purple' && (isRtl ? 'border-r-4 border-r-purple-500' : 'border-l-4 border-l-purple-500'),
              s.color === 'amber'  && (isRtl ? 'border-r-4 border-r-amber-500'  : 'border-l-4 border-l-amber-500'),
              s.color === 'red'    && (isRtl ? 'border-r-4 border-r-red-500'    : 'border-l-4 border-l-red-500'),
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'purple' && 'bg-purple-100',
              s.color === 'amber' && 'bg-amber-100',
              s.color === 'red' && 'bg-red-100',
            )}>
              <s.icon className={cn(
                'w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'purple' && 'text-purple-600',
                s.color === 'amber' && 'text-amber-600',
                s.color === 'red' && 'text-red-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Modules grid ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.href + m.titleKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={m.href}
                className="premium-card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow group h-full"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: m.color + '18', color: m.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {m.count !== undefined && (
                    <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full"
                      style={{ background: m.color + '15', color: m.color }}>
                      {m.count}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">
                    {t[m.titleKey]}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t[m.subKey]}</p>
                </div>
                <div className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:text-blue-800">
                  {t.openModule}
                  <ArrowRight className={cn('w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5', isRtl && 'flip-rtl')} />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* ===== Bottom row: Activity + Health + Permissions ===== */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Activity */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900">{t.recentActivity}</h2>
            </div>
            <Link href="/activity-logs" className="text-xs text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1">
              {t.seeAllLogs}
              <ArrowRight className={cn('w-3.5 h-3.5', isRtl && 'flip-rtl')} />
            </Link>
          </div>
          {adminFeed.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {adminFeed.map(l => (
                <li key={l.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-snug">
                      <span className="font-semibold">{l.user_name}</span>{' '}
                      <span className="text-gray-500">
                        {l.action.replace(/_/g, ' ')} {(l.entity_type ?? '').replace(/_/g, ' ')}
                        {l.entity_name && <> · <span className="font-mono text-[11px] text-gray-700">{l.entity_name}</span></>}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(l.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Health */}
        <div className="premium-card p-5 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            {t.healthTitle}
          </h2>
          <ul className="space-y-2 mt-2">
            <HealthRow icon={ShieldCheck} label={t.health2fa}    status="active"  text={t.healthStatusActive} />
            <HealthRow icon={Database}    label={t.healthBackup} status="active"  text="2 hours ago" />
            <HealthRow
              icon={Cloud}
              label={t.healthSync}
              status="active"
              text={t.healthStatusActive}
            />
            <HealthRow
              icon={Database}
              label={t.healthDb}
              status="active"
              text={t.healthStatusHealthy}
            />
          </ul>
        </div>
      </div>

      {/* ===== Roles & Permissions table ===== */}
      <div id="roles" className="premium-card p-5 scroll-anchor">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-gray-900">{t.rolesPermsTitle}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">{t.rolesPermsSub}</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.permsTableRole}</th>
                <th className="text-center">{t.permsAdmin}</th>
                <th className="text-center">{t.permsResearch}</th>
                <th className="text-center">{t.permsApprovals}</th>
                <th className="text-center">{t.permsReports}</th>
                <th className="text-center">{t.permsConfidential}</th>
                <th className="text-center">{t.permsPublic}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ROLE_PERMS) as UserRole[]).map(r => {
                const p = ROLE_PERMS[r]
                return (
                  <tr key={r}>
                    <td>
                      <span className="text-sm font-semibold text-gray-900">{ROLE_LABELS[r]}</span>
                    </td>
                    <td className="text-center"><PermCell granted={p.admin} /></td>
                    <td className="text-center"><PermCell granted={p.research} /></td>
                    <td className="text-center"><PermCell granted={p.approvals} /></td>
                    <td className="text-center"><PermCell granted={p.reports} /></td>
                    <td className="text-center"><PermCell granted={p.confidential} /></td>
                    <td className="text-center"><PermCell granted={p.publicOnly} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// -------- Subcomponents --------

function HealthRow({
  icon: Icon, label, status, text,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  status: 'active' | 'demo' | 'inactive'
  text: string
}) {
  const color =
    status === 'active' ? 'bg-emerald-500'
    : status === 'demo' ? 'bg-amber-500'
    : 'bg-gray-400'
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2 text-gray-700">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        {label}
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full', color)} />
        <span className="font-semibold text-gray-700">{text}</span>
      </span>
    </li>
  )
}

function PermCell({ granted }: { granted: boolean }) {
  return granted ? (
    <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
  ) : (
    <span className="text-gray-300 mx-auto block text-center">—</span>
  )
}
