'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  AlertCircle, ArchiveRestore, ArrowLeft, BadgeCheck, Building2, CheckCircle,
  ChevronDown, Edit2, Eye, FileSpreadsheet, Filter, Key, Languages, Lock,
  Mail, Phone, Plus, RefreshCw, Save, Search, Shield, ShieldCheck, Sparkles,
  Trash2, UserPlus, Users, X,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { useDepartments, useUsers } from '@/lib/data-source'
import { canManageUsers } from '@/lib/permissions'
import { cn, formatDate, getInitials, timeAgo } from '@/lib/utils'
import type { Department } from '@/types'
import { ROLE_LABELS, type Profile, type UserRole } from '@/types'

type Lang = 'en' | 'ar'
type AccountStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'archived'

// Extra fields the spec requires that the base Profile type does not (yet) carry.
type ExtendedProfile = Profile & {
  job_title?: string
  employee_id?: string
  account_status?: AccountStatus
  must_change_password?: boolean
  notes?: string
}

// ---------------- Translations ----------------

const T = {
  en: {
    pageTitle: 'User Management',
    pageSub: 'Add, edit, suspend and assign roles to portal users.',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — saved locally in this browser',
    addUser: 'Add new user',
    export: 'Export',
    accessDenied: 'Admin access only',
    accessDeniedSub: 'Only administrators can manage users. Switch to an admin account or contact your Super Admin.',
    goBack: 'Back to dashboard',
    searchPh: 'Search by name, email, username, employee ID…',
    allRoles: 'All roles',
    allDepts: 'All departments',
    allStatus: 'All status',
    statTotal: 'Total users',
    statActive: 'Active',
    statSuspended: 'Suspended',
    statPending: 'Pending approval',
    colUser: 'User',
    colUsername: 'Username',
    colRole: 'Role',
    colDept: 'Department',
    colStatus: 'Status',
    colLastLogin: 'Last login',
    colLogins: 'Logins',
    colActions: 'Actions',
    actionEdit: 'Edit',
    actionResetPw: 'Reset password',
    actionSuspend: 'Suspend',
    actionActivate: 'Activate',
    actionArchive: 'Archive',
    actionRestore: 'Restore',
    confirmArchive: 'Archive this user? They will no longer be able to sign in.',
    confirmRestore: 'Restore this archived user?',
    confirmResetPw: 'Send a password reset to {email}?',
    suspendDone: 'User suspended.',
    activateDone: 'User activated.',
    archiveDone: 'User archived.',
    restoreDone: 'User restored.',
    pwResetSent: 'Password reset link sent to {email}.',
    createdUser: 'User created. Initial credentials shown once below.',
    updatedUser: 'User updated.',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    statusSuspended: 'Suspended',
    statusPending: 'Pending approval',
    statusArchived: 'Archived',
    never: 'Never',
    // Modal
    modalNewTitle: 'Add new user',
    modalEditTitle: 'Edit user',
    fldFullName: 'Full name',
    fldFullNameAr: 'Full name (Arabic)',
    fldEmail: 'Email',
    fldPhone: 'Mobile number',
    fldEmployeeId: 'Employee ID',
    fldJobTitle: 'Job title',
    fldUsername: 'Username',
    fldUsernameHint: 'Unique across the platform. Auto-generated if left blank.',
    fldUsernameTaken: 'This username is already taken.',
    fldRole: 'Role',
    fldDepartment: 'Department',
    fldStatus: 'Account status',
    fldNotes: 'Notes',
    fldNotesPh: 'Internal notes about this account…',
    forceChangePw: 'Force password change on first login',
    sendInvite: 'Send invite email when saved',
    save: 'Save user',
    saving: 'Saving…',
    cancel: 'Cancel',
    requiredName: 'Full name is required.',
    requiredEmail: 'A valid email is required.',
    duplicateEmail: 'A user with this email already exists.',
    duplicateEmployee: 'A user with this employee ID already exists.',
    autoUsername: 'Auto-generate',
    initialPwTitle: 'Initial temporary password',
    initialPwSub: 'Copy and share securely. User must change it on first login.',
    copyCreds: 'Copy credentials',
    creds: 'Credentials',
    copied: 'Copied to clipboard.',
    bulkSelected: '{n} selected',
    bulkActivate: 'Activate selected',
    bulkSuspend: 'Suspend selected',
    bulkArchive: 'Archive selected',
    exported: 'User list exported.',
  },
  ar: {
    pageTitle: 'إدارة المستخدمين',
    pageSub: 'إضافة وتعديل وتعليق المستخدمين وتعيين الأدوار.',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — محفوظة محليًا في هذا المتصفح',
    addUser: 'إضافة مستخدم',
    export: 'تصدير',
    accessDenied: 'الوصول للمسؤولين فقط',
    accessDeniedSub: 'فقط المسؤولون يمكنهم إدارة المستخدمين. سجل الدخول بحساب مسؤول أو تواصل مع المسؤول الرئيسي.',
    goBack: 'العودة إلى لوحة التحكم',
    searchPh: 'ابحث بالاسم، البريد، اسم المستخدم، الرقم الوظيفي…',
    allRoles: 'كل الأدوار',
    allDepts: 'كل الأقسام',
    allStatus: 'كل الحالات',
    statTotal: 'إجمالي المستخدمين',
    statActive: 'نشط',
    statSuspended: 'مُعلَّق',
    statPending: 'بانتظار الموافقة',
    colUser: 'المستخدم',
    colUsername: 'اسم المستخدم',
    colRole: 'الدور',
    colDept: 'القسم',
    colStatus: 'الحالة',
    colLastLogin: 'آخر دخول',
    colLogins: 'مرات الدخول',
    colActions: 'إجراءات',
    actionEdit: 'تعديل',
    actionResetPw: 'إعادة تعيين كلمة المرور',
    actionSuspend: 'تعليق',
    actionActivate: 'تفعيل',
    actionArchive: 'أرشفة',
    actionRestore: 'استرجاع',
    confirmArchive: 'هل ترغب بأرشفة هذا المستخدم؟ لن يتمكن من الدخول.',
    confirmRestore: 'استعادة هذا المستخدم؟',
    confirmResetPw: 'إرسال رابط إعادة تعيين كلمة المرور إلى {email}؟',
    suspendDone: 'تم تعليق المستخدم.',
    activateDone: 'تم تفعيل المستخدم.',
    archiveDone: 'تمت أرشفة المستخدم.',
    restoreDone: 'تم استرجاع المستخدم.',
    pwResetSent: 'تم إرسال رابط إعادة التعيين إلى {email}.',
    createdUser: 'تم إنشاء المستخدم. بيانات الدخول تظهر مرة واحدة فقط.',
    updatedUser: 'تم تحديث المستخدم.',
    statusActive: 'نشط',
    statusInactive: 'غير نشط',
    statusSuspended: 'مُعلَّق',
    statusPending: 'بانتظار الموافقة',
    statusArchived: 'مؤرشف',
    never: 'لا يوجد',
    modalNewTitle: 'مستخدم جديد',
    modalEditTitle: 'تعديل مستخدم',
    fldFullName: 'الاسم الكامل',
    fldFullNameAr: 'الاسم بالعربية',
    fldEmail: 'البريد الإلكتروني',
    fldPhone: 'رقم الجوال',
    fldEmployeeId: 'الرقم الوظيفي',
    fldJobTitle: 'المسمى الوظيفي',
    fldUsername: 'اسم المستخدم',
    fldUsernameHint: 'فريد على المنصة. يتم إنشاؤه تلقائيًا إن ترك فارغًا.',
    fldUsernameTaken: 'اسم المستخدم مستخدم بالفعل.',
    fldRole: 'الدور',
    fldDepartment: 'القسم',
    fldStatus: 'حالة الحساب',
    fldNotes: 'ملاحظات',
    fldNotesPh: 'ملاحظات داخلية…',
    forceChangePw: 'إجبار تغيير كلمة المرور عند أول دخول',
    sendInvite: 'إرسال دعوة بالبريد عند الحفظ',
    save: 'حفظ المستخدم',
    saving: 'جاري الحفظ…',
    cancel: 'إلغاء',
    requiredName: 'الاسم مطلوب.',
    requiredEmail: 'بريد إلكتروني صحيح مطلوب.',
    duplicateEmail: 'هناك مستخدم بنفس البريد.',
    duplicateEmployee: 'هناك مستخدم بنفس الرقم الوظيفي.',
    autoUsername: 'إنشاء تلقائي',
    initialPwTitle: 'كلمة المرور المؤقتة الأولية',
    initialPwSub: 'انسخها وشاركها بأمان. سيُجبر المستخدم على تغييرها عند الدخول.',
    copyCreds: 'نسخ بيانات الدخول',
    creds: 'بيانات الدخول',
    copied: 'تم النسخ.',
    bulkSelected: 'تم تحديد {n}',
    bulkActivate: 'تفعيل المحدد',
    bulkSuspend: 'تعليق المحدد',
    bulkArchive: 'أرشفة المحدد',
    exported: 'تم تصدير قائمة المستخدمين.',
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

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-rose-100 text-rose-700 border-rose-200',
  admin: 'bg-red-100 text-red-700 border-red-200',
  research_director: 'bg-purple-100 text-purple-700 border-purple-200',
  department_head: 'bg-blue-100 text-blue-700 border-blue-200',
  research_coordinator: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  authorized_staff: 'bg-green-100 text-green-700 border-green-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_COLORS: Record<AccountStatus, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-700 border-gray-200',
  suspended: 'bg-orange-100 text-orange-700 border-orange-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  archived: 'bg-rose-100 text-rose-700 border-rose-200',
}

const STORAGE_KEY = 'pmnh-users-v1'
const AUDIT_KEY = 'pmnh-user-audit-v1'

type AuditEntry = { id: string; at: string; actor: string; action: string; subject: string; details?: string }

function loadUsers(): ExtendedProfile[] {
  // localStorage cache survives a refresh while the Supabase query is in
  // flight. The component overwrites this with live profile rows as soon
  // as useUsers() resolves.
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ExtendedProfile[]
  } catch {/* ignore */}
  return []
}

/** Map a raw Supabase profile row into the local ExtendedProfile shape this
 *  page renders. Pure — no defaults are invented beyond what the schema says. */
function profileToExtended(u: Profile): ExtendedProfile {
  const status: AccountStatus = u.is_active ? 'active' : 'inactive'
  return {
    ...u,
    account_status: status,
    must_change_password: false,
  }
}

function saveUsers(list: ExtendedProfile[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function loadAudit(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    if (raw) return JSON.parse(raw) as AuditEntry[]
  } catch {/* ignore */}
  return []
}
function saveAudit(list: AuditEntry[]) {
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, 200))) } catch {/* ignore */}
}

function slugifyName(name: string) {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s.]/g, '').trim().split(/\s+/).slice(0, 2).join('.')
}
function uniqueUsername(base: string, existing: Set<string>): string {
  let candidate = base || `user.${Date.now().toString(36)}`
  if (!existing.has(candidate)) return candidate
  let n = 1
  while (existing.has(`${candidate}${n}`)) n++
  return `${candidate}${n}`
}
function generateTempPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'
  const sym = '!@#$%&*'
  let out = ''
  for (let i = 0; i < 11; i++) out += charset[Math.floor(Math.random() * charset.length)]
  return out + sym[Math.floor(Math.random() * sym.length)] + Math.floor(Math.random() * 100)
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang] as Translations
  const isRtl = lang === 'ar'

  // Live departments for the filter dropdown + per-row badge lookup.
  const { data: deptData } = useDepartments()
  const departments: Department[] = deptData ?? []

  // Live users from Supabase. The localStorage cache survives a refresh while
  // useUsers() resolves; once it resolves we overwrite with the live rows.
  const { data: profileRows } = useUsers()
  // Users state
  const [users, setUsers] = useState<ExtendedProfile[]>([])
  useEffect(() => {
    if (profileRows) setUsers(profileRows.map(profileToExtended))
  }, [profileRows])
  useEffect(() => { setUsers(loadUsers()) }, [])
  useEffect(() => { if (users.length) saveUsers(users) }, [users])

  // Audit log
  const [audit, setAudit] = useState<AuditEntry[]>([])
  useEffect(() => { setAudit(loadAudit()) }, [])
  function logAudit(action: string, subject: string, details?: string) {
    const entry: AuditEntry = {
      id: `audit-${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      actor: currentUser?.full_name || 'system',
      action, subject, details,
    }
    setAudit(prev => {
      const next = [entry, ...prev]
      saveAudit(next)
      return next
    })
  }

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase()
        const hay = [u.full_name, u.email, u.username, u.employee_id || '', u.phone || ''].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (deptFilter !== 'all' && u.department_id !== deptFilter) return false
      if (statusFilter !== 'all') {
        const status = (u.account_status as AccountStatus | undefined) ?? (u.is_active ? 'active' : 'inactive')
        if (status !== statusFilter) return false
      }
      return true
    })
  }, [users, search, roleFilter, deptFilter, statusFilter])

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => (u.account_status ?? (u.is_active ? 'active' : 'inactive')) === 'active').length,
    suspended: users.filter(u => u.account_status === 'suspended').length,
    pending: users.filter(u => u.account_status === 'pending').length,
  }), [users])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExtendedProfile | null>(null)
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null)

  function openCreate() { setEditing(null); setCreatedCreds(null); setModalOpen(true) }
  function openEdit(u: ExtendedProfile) { setEditing(u); setCreatedCreds(null); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  // Access gate — per spec, ONLY the Super Admin can view / manage users.
  // Regular `admin` accounts (Afnan Bakri) see the access-denied screen.
  if (!currentUser) return null
  if (!canManageUsers(currentUser.role)) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-[60vh] flex items-center justify-center">
        <div className="premium-card p-10 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-gray-900">{t.accessDenied}</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{t.accessDeniedSub}</p>
          <Link href="/dashboard" className="btn-primary text-sm mt-6">
            <ArrowLeft className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
            {t.goBack}
          </Link>
        </div>
      </div>
    )
  }

  // ---------- Actions ----------
  function statusOf(u: ExtendedProfile): AccountStatus {
    return u.account_status ?? (u.is_active ? 'active' : 'inactive')
  }
  function setStatus(id: string, status: AccountStatus, toastKey?: keyof Translations) {
    const u = users.find(x => x.id === id)
    setUsers(prev => prev.map(x => x.id === id ? { ...x, account_status: status, is_active: status === 'active' } : x))
    if (u) logAudit(`status:${status}`, u.full_name, `to ${status}`)
    if (toastKey) toast.success(t[toastKey])
  }
  function archiveUser(id: string) {
    if (!confirm(t.confirmArchive)) return
    setStatus(id, 'archived', 'archiveDone')
  }
  function restoreUser(id: string) {
    if (!confirm(t.confirmRestore)) return
    setStatus(id, 'active', 'restoreDone')
  }
  function suspendUser(id: string) { setStatus(id, 'suspended', 'suspendDone') }
  function activateUser(id: string) { setStatus(id, 'active', 'activateDone') }
  function resetPassword(u: ExtendedProfile) {
    if (!confirm(format(t.confirmResetPw, { email: u.email }))) return
    logAudit('reset_password', u.full_name, `Sent reset to ${u.email}`)
    toast.success(format(t.pwResetSent, { email: u.email }))
  }

  function bulkAct(action: 'activate' | 'suspend' | 'archive') {
    if (selectedIds.size === 0) return
    const status: AccountStatus = action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : 'archived'
    setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, account_status: status, is_active: status === 'active' } : u))
    users.filter(u => selectedIds.has(u.id)).forEach(u => logAudit(`bulk:${status}`, u.full_name))
    toast.success(`${selectedIds.size} updated`)
    setSelectedIds(new Set())
  }

  function exportUsers() {
    const header = [
      'Full Name','Email','Phone','Username','Employee ID','Job Title','Role','Department','Status','Last Login','Logins',
    ]
    const rows = filtered.map(u => [
      u.full_name, u.email, u.phone || '', u.username, u.employee_id || '', u.job_title || '',
      u.role, departments.find(d => d.id === u.department_id)?.name || '', statusOf(u),
      u.last_login || '', String(u.login_count ?? 0),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pmnh-users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link); link.click(); link.remove()
    URL.revokeObjectURL(link.href)
    toast.success(t.exported)
  }

  function handleSaveUser(rec: ExtendedProfile, opts: { initialPw?: string }) {
    if (editing) {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...rec, updated_at: new Date().toISOString() } : u))
      logAudit('update', rec.full_name)
      toast.success(t.updatedUser)
      closeModal()
    } else {
      setUsers(prev => [rec, ...prev])
      logAudit('create', rec.full_name, `as ${ROLE_LABELS[rec.role]}`)
      toast.success(t.createdUser)
      if (opts.initialPw) setCreatedCreds({ username: rec.username, password: opts.initialPw })
      // keep modal open to show credentials; user closes manually
    }
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {t.pageTitle}
          </h1>
          <p className="page-subtitle">
            {t.pageSub}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
              {t.liveData}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="btn-secondary text-sm"
          >
            <Languages className="w-4 h-4" />
            {t.languageBtn}
          </button>
          <button type="button" onClick={exportUsers} className="btn-secondary text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            {t.export}
          </button>
          <button type="button" onClick={openCreate} className="btn-primary text-sm">
            <UserPlus className="w-4 h-4" />
            {t.addUser}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statTotal,      value: stats.total,      icon: Users,        color: 'blue' },
          { label: t.statActive,     value: stats.active,     icon: CheckCircle,  color: 'green' },
          { label: t.statSuspended,  value: stats.suspended,  icon: AlertCircle,  color: 'orange' },
          { label: t.statPending,    value: stats.pending,    icon: Shield,       color: 'amber' },
        ].map(s => (
          <div
            key={s.label}
            className={cn(
              'premium-card p-4 flex items-center gap-3',
              s.color === 'blue'   && (isRtl ? 'border-r-4 border-r-blue-500'   : 'border-l-4 border-l-blue-500'),
              s.color === 'green'  && (isRtl ? 'border-r-4 border-r-green-500'  : 'border-l-4 border-l-green-500'),
              s.color === 'orange' && (isRtl ? 'border-r-4 border-r-orange-500' : 'border-l-4 border-l-orange-500'),
              s.color === 'amber'  && (isRtl ? 'border-r-4 border-r-amber-500'  : 'border-l-4 border-l-amber-500'),
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'orange' && 'bg-orange-100',
              s.color === 'amber' && 'bg-amber-100',
            )}>
              <s.icon className={cn(
                'w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'orange' && 'text-orange-600',
                s.color === 'amber' && 'text-amber-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPh}
            className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')} className="form-input w-auto min-w-[150px]">
          <option value="all">{t.allRoles}</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allDepts}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AccountStatus | 'all')} className="form-input w-auto min-w-[150px]">
          <option value="all">{t.allStatus}</option>
          <option value="active">{t.statusActive}</option>
          <option value="inactive">{t.statusInactive}</option>
          <option value="suspended">{t.statusSuspended}</option>
          <option value="pending">{t.statusPending}</option>
          <option value="archived">{t.statusArchived}</option>
        </select>

        {selectedIds.size > 0 && (
          <div className="ms-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700">
            <BadgeCheck className="w-3.5 h-3.5" />
            {format(t.bulkSelected, { n: selectedIds.size })}
            <span aria-hidden>·</span>
            <button type="button" onClick={() => bulkAct('activate')} className="hover:underline">{t.bulkActivate}</button>
            <span aria-hidden>·</span>
            <button type="button" onClick={() => bulkAct('suspend')} className="hover:underline">{t.bulkSuspend}</button>
            <span aria-hidden>·</span>
            <button type="button" onClick={() => bulkAct('archive')} className="hover:underline">{t.bulkArchive}</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(u => u.id)) : new Set())}
                  />
                </th>
                <th>{t.colUser}</th>
                <th>{t.colUsername}</th>
                <th>{t.colRole}</th>
                <th>{t.colDept}</th>
                <th>{t.colStatus}</th>
                <th>{t.colLastLogin}</th>
                <th>{t.colLogins}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const dept = u.department_id ? departments.find(d => d.id === u.department_id) : undefined
                  const status = statusOf(u)
                  return (
                    <tr key={u.id} className={cn(selectedIds.has(u.id) && 'bg-blue-50/40')}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={e => setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(u.id); else next.delete(u.id)
                            return next
                          })}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(u.full_name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{u.full_name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{u.username}</span>
                      </td>
                      <td>
                        <span className={cn('badge text-xs', ROLE_COLORS[u.role])}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td>
                        {dept ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
                            <Building2 className="w-3 h-3" />
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className={cn('badge text-[11px]', STATUS_COLORS[status])}>
                          {t[(`status${status.charAt(0).toUpperCase()}${status.slice(1)}`) as keyof Translations] || status}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-500">
                          {u.last_login ? timeAgo(u.last_login) : t.never}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm font-semibold text-gray-700 tabular-nums">{u.login_count ?? 0}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            title={t.actionEdit}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => resetPassword(u)}
                            title={t.actionResetPw}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          {status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => suspendUser(u.id)}
                              title={t.actionSuspend}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : status === 'archived' ? (
                            <button
                              type="button"
                              onClick={() => restoreUser(u.id)}
                              title={t.actionRestore}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => activateUser(u.id)}
                              title={t.actionActivate}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => archiveUser(u.id)}
                            title={t.actionArchive}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent audit */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-blue-600" />
            Audit log (recent)
          </h2>
          <Link href="/activity-logs" className="text-xs font-semibold text-blue-700 hover:text-blue-800">View all</Link>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-gray-400">No actions yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {audit.slice(0, 6).map(a => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl p-2 text-xs hover:bg-gray-50">
                <span className="font-mono text-gray-400">{timeAgo(a.at)}</span>
                <span className="font-semibold text-gray-800">{a.actor}</span>
                <span className="text-gray-500">{a.action}</span>
                <span className="text-gray-900 font-medium">{a.subject}</span>
                {a.details && <span className="text-gray-400">· {a.details}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <UserModal
            t={t}
            isRtl={isRtl}
            existing={users}
            departments={departments}
            editing={editing}
            onClose={closeModal}
            onSave={handleSaveUser}
            createdCreds={createdCreds}
            onCloseAfterCreds={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// --------------- User Modal ---------------

function UserModal({
  t, isRtl, existing, departments, editing, onClose, onSave, createdCreds, onCloseAfterCreds,
}: {
  t: Translations
  isRtl: boolean
  existing: ExtendedProfile[]
  departments: Department[]
  editing: ExtendedProfile | null
  onClose: () => void
  onSave: (u: ExtendedProfile, opts: { initialPw?: string }) => void
  createdCreds: { username: string; password: string } | null
  onCloseAfterCreds: () => void
}) {
  const [fullName, setFullName] = useState(editing?.full_name || '')
  const [fullNameAr, setFullNameAr] = useState((editing as { full_name_ar?: string } | null)?.full_name_ar || '')
  const [email, setEmail] = useState(editing?.email || '')
  const [phone, setPhone] = useState(editing?.phone || '')
  const [employeeId, setEmployeeId] = useState(editing?.employee_id || '')
  const [jobTitle, setJobTitle] = useState(editing?.job_title || '')
  const [username, setUsername] = useState(editing?.username || '')
  const [role, setRole] = useState<UserRole>(editing?.role || 'authorized_staff')
  const [departmentId, setDepartmentId] = useState<string>(editing?.department_id || '')
  const [status, setStatus] = useState<AccountStatus>(editing?.account_status ?? (editing?.is_active ? 'active' : 'pending'))
  const [notes, setNotes] = useState(editing?.notes || '')
  const [forceChange, setForceChange] = useState(editing ? !!editing.must_change_password : true)
  const [sendInvite, setSendInvite] = useState(true)
  const [saving, setSaving] = useState(false)

  const existingUsernames = useMemo(() => new Set(existing
    .filter(u => u.id !== editing?.id)
    .map(u => u.username)), [existing, editing?.id])
  const existingEmails = useMemo(() => new Set(existing
    .filter(u => u.id !== editing?.id)
    .map(u => u.email.toLowerCase())), [existing, editing?.id])
  const existingEmployees = useMemo(() => new Set(existing
    .filter(u => u.id !== editing?.id && u.employee_id)
    .map(u => (u.employee_id as string).toUpperCase())), [existing, editing?.id])

  const usernameTaken = !!username && existingUsernames.has(username)

  function autoGenUsername() {
    const base = slugifyName(fullName) || `user.${Date.now().toString(36)}`
    setUsername(uniqueUsername(base, existingUsernames))
  }

  async function handleSubmit() {
    if (!fullName.trim()) { toast.error(t.requiredName); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error(t.requiredEmail); return }
    if (existingEmails.has(email.trim().toLowerCase())) { toast.error(t.duplicateEmail); return }
    if (employeeId && existingEmployees.has(employeeId.trim().toUpperCase())) { toast.error(t.duplicateEmployee); return }

    setSaving(true)
    const finalUsername = (username.trim() || uniqueUsername(slugifyName(fullName), existingUsernames))
    if (existingUsernames.has(finalUsername)) {
      toast.error(t.fldUsernameTaken)
      setSaving(false)
      return
    }
    await new Promise(r => setTimeout(r, 350))

    const id = editing?.id || `u-${Date.now().toString(36)}`
    const tempPw = editing ? undefined : generateTempPassword()

    const rec: ExtendedProfile = {
      id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      employee_id: employeeId.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
      username: finalUsername,
      role,
      department_id: departmentId || undefined,
      account_status: status,
      is_active: status === 'active',
      email_verified: editing?.email_verified ?? false,
      phone_verified: editing?.phone_verified ?? false,
      must_change_password: forceChange,
      notes: notes.trim() || undefined,
      avatar_url: editing?.avatar_url,
      last_login: editing?.last_login,
      login_count: editing?.login_count ?? 0,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(rec, { initialPw: tempPw })
    setSaving(false)
  }

  async function copyCredentials() {
    if (!createdCreds) return
    await navigator.clipboard.writeText(`Username: ${createdCreds.username}\nPassword: ${createdCreds.password}`)
    toast.success(t.copied)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden
      />
      <motion.div
        role="dialog" aria-modal="true"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              {editing ? t.modalEditTitle : t.modalNewTitle}
            </h2>
            <button
              type="button" onClick={onClose} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {createdCreds ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
                <p className="text-sm font-bold text-emerald-800 inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t.initialPwTitle}
                </p>
                <p className="text-xs text-emerald-700/85">{t.initialPwSub}</p>
                <div className="bg-white rounded-xl p-3 font-mono text-xs space-y-1">
                  <p><span className="text-gray-500">username:</span> {createdCreds.username}</p>
                  <p><span className="text-gray-500">password:</span> {createdCreds.password}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={copyCredentials} className="btn-secondary text-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    {t.copyCreds}
                  </button>
                  <button type="button" onClick={onCloseAfterCreds} className="btn-primary text-sm">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t.fldFullName} required>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" autoFocus />
                  </Field>
                  <Field label={t.fldFullNameAr}>
                    <input value={fullNameAr} onChange={e => setFullNameAr(e.target.value)} dir="rtl" className="form-input" />
                  </Field>
                  <Field label={t.fldEmail} required>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" dir="ltr" />
                  </Field>
                  <Field label={t.fldPhone}>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" className="form-input" dir="ltr" />
                  </Field>
                  <Field label={t.fldEmployeeId}>
                    <input value={employeeId} onChange={e => setEmployeeId(e.target.value.toUpperCase())} placeholder="EMP-001" className="form-input font-mono" dir="ltr" />
                  </Field>
                  <Field label={t.fldJobTitle}>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="form-input" />
                  </Field>
                </div>

                <Field label={t.fldUsername}>
                  <div className="flex gap-2">
                    <input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="auto-generated"
                      className={cn('form-input font-mono flex-1', usernameTaken && 'border-red-300 focus:ring-red-200')}
                      dir="ltr"
                    />
                    <button type="button" onClick={autoGenUsername} className="btn-secondary text-sm whitespace-nowrap">
                      <RefreshCw className="w-4 h-4" />
                      {t.autoUsername}
                    </button>
                  </div>
                  {usernameTaken ? (
                    <p className="text-[11px] text-red-600 mt-1">{t.fldUsernameTaken}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-1">{t.fldUsernameHint}</p>
                  )}
                </Field>

                <div className="grid md:grid-cols-3 gap-4">
                  <Field label={t.fldRole}>
                    <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="form-input">
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.fldDepartment}>
                    <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                      <option value="">—</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label={t.fldStatus}>
                    <select value={status} onChange={e => setStatus(e.target.value as AccountStatus)} className="form-input">
                      <option value="active">{t.statusActive}</option>
                      <option value="pending">{t.statusPending}</option>
                      <option value="inactive">{t.statusInactive}</option>
                      <option value="suspended">{t.statusSuspended}</option>
                      <option value="archived">{t.statusArchived}</option>
                    </select>
                  </Field>
                </div>

                <Field label={t.fldNotes}>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t.fldNotesPh}
                    className="form-input min-h-[64px]"
                    rows={2}
                  />
                </Field>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={forceChange} onChange={e => setForceChange(e.target.checked)} className="w-4 h-4 rounded" />
                    {t.forceChangePw}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} className="w-4 h-4 rounded" />
                    {t.sendInvite}
                  </label>
                </div>
              </>
            )}
          </div>

          {!createdCreds && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">
                {t.cancel}
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving || usernameTaken} className="btn-primary text-sm">
                {saving ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                {saving ? t.saving : t.save}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      {children}
    </div>
  )
}
