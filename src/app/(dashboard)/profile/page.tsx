'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Activity, AlertCircle, BadgeCheck, Bell, Building2, Camera, CheckCircle,
  Clock, Eye, EyeOff, FileBarChart, Globe, Key, Languages, Lock, LogOut,
  Mail, Phone, Save, Shield, ShieldCheck, Smartphone, Sparkles, Sun, Trash2,
  User as UserIcon, X,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { cn, formatDate, getInitials, timeAgo } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'

type Lang = 'en' | 'ar'
type Section = 'personal' | 'security' | 'notifications' | 'activity'

// ---------------- Translations ----------------

const T = {
  en: {
    pageTitle: 'My Profile',
    pageSub: 'Your personal account, security and notification preferences.',
    languageBtn: 'العربية',
    sectionPersonal: 'Personal information',
    sectionSecurity: 'Security & password',
    sectionNotifications: 'Notifications',
    sectionActivity: 'Activity & sessions',
    avatarChange: 'Change photo',
    avatarRemove: 'Remove',
    avatarHint: 'JPG / PNG up to 1 MB',
    fldFullName: 'Full name',
    fldEmail: 'Email address',
    fldPhone: 'Mobile number',
    fldUsername: 'Username',
    fldEmployeeId: 'Employee ID',
    fldJobTitle: 'Job title',
    fldDepartment: 'Department',
    fldRole: 'Role',
    fldLanguage: 'Interface language',
    langEn: 'English',
    langAr: 'العربية',
    save: 'Save changes',
    saving: 'Saving…',
    saved: 'Profile updated.',
    readonly: 'Read-only',
    securityIntro: 'Strong passwords keep clinical data safe. Minimum 12 characters.',
    fldCurrentPassword: 'Current password',
    fldNewPassword: 'New password',
    fldConfirmPassword: 'Confirm new password',
    changePassword: 'Change password',
    changingPassword: 'Updating…',
    pwChanged: 'Password changed.',
    pwShort: 'Password must be at least 12 characters.',
    pwMismatch: 'Passwords do not match.',
    pwNeedsCurrent: 'Enter your current password.',
    strengthWeak: 'Weak',
    strengthFair: 'Fair',
    strengthGood: 'Good',
    strengthStrong: 'Strong',
    twoFactorTitle: 'Two-factor authentication',
    twoFactorSub: 'Add an extra layer of security with TOTP authenticator apps.',
    twoFactorEnable: 'Enable 2FA',
    twoFactorDisable: 'Disable 2FA',
    twoFactorEnabled: '2FA is enabled.',
    twoFactorDisabled: '2FA is disabled.',
    changeUsernameTitle: 'Change username',
    changeUsernameSub: 'Usernames are unique across the platform and used for sign-in.',
    fldNewUsername: 'New username',
    updateUsername: 'Update username',
    usernameUpdated: 'Username updated.',
    sessions: 'Signed-in sessions',
    sessionsSub: 'Devices that are currently signed in to your account.',
    currentSession: 'This device',
    revoke: 'Sign out',
    notifIntro: 'Choose which alerts you want to receive.',
    notifEmail: 'Email',
    notifSms: 'SMS',
    notifInApp: 'In-app',
    notifSave: 'Save preferences',
    notifSaved: 'Notification preferences saved.',
    notifDelays: 'Delayed project alerts',
    notifDeadlines: 'Upcoming deadline reminders',
    notifApprovals: 'IRB / Ethics approval updates',
    notifPublications: 'Publication acceptances',
    notifQr: 'New QR registration submissions',
    notifSecurity: 'Security & login activity',
    activityTitle: 'Account activity',
    activitySub: 'A quick summary of your portal usage.',
    metricLogins: 'Total logins',
    metricLastLogin: 'Last login',
    metricStatus: 'Account status',
    metricMember: 'Member since',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    accessTitle: 'Access overview',
    accessSub: 'Modules you can use based on your assigned role.',
    visibilityRole: 'Your role',
    visibilityDept: 'Your department',
    sessionSafariIphone: 'Safari · iPhone 14',
    sessionChromeWin: 'Chrome · Windows 11',
    minsAgo: '{n} minutes ago',
    hoursAgo: '{n} hours ago',
    daysAgo: '{n} days ago',
    accessAdmin: 'Admin Panel & user management',
    accessResearch: 'Research database (full CRUD)',
    accessReports: 'Reports & exports',
    accessFiles: 'File uploads & downloads',
    accessQr: 'QR code & registration',
    accessConfidential: 'Confidential research details',
  },
  ar: {
    pageTitle: 'ملفي الشخصي',
    pageSub: 'حسابك الشخصي وإعدادات الأمان والإشعارات.',
    languageBtn: 'English',
    sectionPersonal: 'المعلومات الشخصية',
    sectionSecurity: 'الأمان وكلمة المرور',
    sectionNotifications: 'الإشعارات',
    sectionActivity: 'النشاط والجلسات',
    avatarChange: 'تغيير الصورة',
    avatarRemove: 'إزالة',
    avatarHint: 'JPG / PNG حتى 1 ميجابايت',
    fldFullName: 'الاسم الكامل',
    fldEmail: 'البريد الإلكتروني',
    fldPhone: 'رقم الجوال',
    fldUsername: 'اسم المستخدم',
    fldEmployeeId: 'الرقم الوظيفي',
    fldJobTitle: 'المسمى الوظيفي',
    fldDepartment: 'القسم',
    fldRole: 'الدور',
    fldLanguage: 'لغة الواجهة',
    langEn: 'English',
    langAr: 'العربية',
    save: 'حفظ التغييرات',
    saving: 'جاري الحفظ…',
    saved: 'تم تحديث الملف.',
    readonly: 'للقراءة فقط',
    securityIntro: 'كلمات المرور القوية تحمي البيانات السريرية. الحد الأدنى 12 حرفًا.',
    fldCurrentPassword: 'كلمة المرور الحالية',
    fldNewPassword: 'كلمة المرور الجديدة',
    fldConfirmPassword: 'تأكيد كلمة المرور الجديدة',
    changePassword: 'تغيير كلمة المرور',
    changingPassword: 'جاري التحديث…',
    pwChanged: 'تم تغيير كلمة المرور.',
    pwShort: 'يجب أن تكون كلمة المرور 12 حرفًا على الأقل.',
    pwMismatch: 'كلمتا المرور غير متطابقتين.',
    pwNeedsCurrent: 'أدخل كلمة المرور الحالية.',
    strengthWeak: 'ضعيفة',
    strengthFair: 'متوسطة',
    strengthGood: 'جيدة',
    strengthStrong: 'قوية',
    twoFactorTitle: 'المصادقة الثنائية',
    twoFactorSub: 'طبقة أمان إضافية باستخدام تطبيقات المصادقة (TOTP).',
    twoFactorEnable: 'تفعيل المصادقة الثنائية',
    twoFactorDisable: 'تعطيل المصادقة الثنائية',
    twoFactorEnabled: 'المصادقة الثنائية مفعّلة.',
    twoFactorDisabled: 'المصادقة الثنائية معطّلة.',
    changeUsernameTitle: 'تغيير اسم المستخدم',
    changeUsernameSub: 'اسم المستخدم فريد على المنصة ويستخدم لتسجيل الدخول.',
    fldNewUsername: 'اسم المستخدم الجديد',
    updateUsername: 'تحديث اسم المستخدم',
    usernameUpdated: 'تم تحديث اسم المستخدم.',
    sessions: 'الجلسات المفتوحة',
    sessionsSub: 'الأجهزة المسجّل دخولها حاليًا.',
    currentSession: 'هذا الجهاز',
    revoke: 'تسجيل الخروج',
    notifIntro: 'اختر التنبيهات التي ترغب في استلامها.',
    notifEmail: 'البريد الإلكتروني',
    notifSms: 'رسائل SMS',
    notifInApp: 'داخل التطبيق',
    notifSave: 'حفظ التفضيلات',
    notifSaved: 'تم حفظ تفضيلات الإشعارات.',
    notifDelays: 'تنبيهات المشاريع المتأخرة',
    notifDeadlines: 'تذكير بالمواعيد القادمة',
    notifApprovals: 'تحديثات اللجنة الأخلاقية / IRB',
    notifPublications: 'قبول النشر',
    notifQr: 'تسجيلات QR جديدة',
    notifSecurity: 'نشاط الأمان وتسجيل الدخول',
    activityTitle: 'نشاط الحساب',
    activitySub: 'ملخص سريع لاستخدامك للبوابة.',
    metricLogins: 'إجمالي عمليات الدخول',
    metricLastLogin: 'آخر دخول',
    metricStatus: 'حالة الحساب',
    metricMember: 'تاريخ الانضمام',
    statusActive: 'نشط',
    statusInactive: 'غير نشط',
    accessTitle: 'صلاحيات الوصول',
    accessSub: 'الوحدات المتاحة لك بناءً على دورك.',
    visibilityRole: 'دورك',
    visibilityDept: 'قسمك',
    sessionSafariIphone: 'Safari · iPhone 14',
    sessionChromeWin: 'Chrome · Windows 11',
    minsAgo: 'قبل {n} دقيقة',
    hoursAgo: 'قبل {n} ساعة',
    daysAgo: 'قبل {n} يوم',
    accessAdmin: 'لوحة المسؤول وإدارة المستخدمين',
    accessResearch: 'قاعدة بيانات الأبحاث (إضافة وتعديل)',
    accessReports: 'التقارير والتصدير',
    accessFiles: 'رفع وتنزيل الملفات',
    accessQr: 'رمز QR والتسجيل',
    accessConfidential: 'تفاصيل الأبحاث السرية',
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

// Password strength: count classes + length.
function passwordStrength(pw: string): { score: 0|1|2|3|4; label: keyof Translations; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++
  const cap = Math.min(4, score) as 0|1|2|3|4
  const buckets = [
    { label: 'strengthWeak'   as keyof Translations, color: '#ef4444' },
    { label: 'strengthWeak'   as keyof Translations, color: '#f97316' },
    { label: 'strengthFair'   as keyof Translations, color: '#f59e0b' },
    { label: 'strengthGood'   as keyof Translations, color: '#3b82f6' },
    { label: 'strengthStrong' as keyof Translations, color: '#16a34a' },
  ]
  return { score: cap, ...buckets[cap] }
}

const SECTION_DEFS: { id: Section; icon: React.ComponentType<{ className?: string }>; key: keyof Translations }[] = [
  { id: 'personal',      icon: UserIcon,    key: 'sectionPersonal' },
  { id: 'security',      icon: ShieldCheck, key: 'sectionSecurity' },
  { id: 'notifications', icon: Bell,        key: 'sectionNotifications' },
  { id: 'activity',      icon: Activity,    key: 'sectionActivity' },
]

const NOTIF_KEYS = [
  { id: 'email_delays',       channel: 'email',  label: 'notifDelays'      as keyof Translations },
  { id: 'email_deadlines',    channel: 'email',  label: 'notifDeadlines'   as keyof Translations },
  { id: 'email_approvals',    channel: 'email',  label: 'notifApprovals'   as keyof Translations },
  { id: 'email_publications', channel: 'email',  label: 'notifPublications'as keyof Translations },
  { id: 'email_qr',           channel: 'email',  label: 'notifQr'          as keyof Translations },
  { id: 'email_security',     channel: 'email',  label: 'notifSecurity'    as keyof Translations },
  { id: 'sms_deadlines',      channel: 'sms',    label: 'notifDeadlines'   as keyof Translations },
  { id: 'sms_security',       channel: 'sms',    label: 'notifSecurity'    as keyof Translations },
  { id: 'inapp_delays',       channel: 'inapp',  label: 'notifDelays'      as keyof Translations },
  { id: 'inapp_deadlines',    channel: 'inapp',  label: 'notifDeadlines'   as keyof Translations },
  { id: 'inapp_qr',           channel: 'inapp',  label: 'notifQr'          as keyof Translations },
] as const

const NOTIF_STORAGE_KEY = 'pmnh-notif-prefs-v1'

const DEFAULT_NOTIF = {
  email_delays: true,
  email_deadlines: true,
  email_approvals: true,
  email_publications: true,
  email_qr: false,
  email_security: true,
  sms_deadlines: false,
  sms_security: true,
  inapp_delays: true,
  inapp_deadlines: true,
  inapp_qr: true,
}

const SESSIONS_STORAGE_KEY = 'pmnh-sessions-v1'

type SessionRow = { id: string; device: string; ip: string; lastActive: string; current: boolean }
function seedSessions(): SessionRow[] {
  return [
    { id: 's1', device: 'Chrome · Windows 11', ip: '192.168.1.100', lastActive: new Date().toISOString(), current: true },
    { id: 's2', device: 'Safari · iPhone 14',  ip: '10.0.0.45',     lastActive: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), current: false },
  ]
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuthStore()

  // Lang
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang] as Translations
  const isRtl = lang === 'ar'

  const [section, setSection] = useState<Section>('personal')

  // Personal fields
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [jobTitle, setJobTitle] = useState((user as { job_title?: string } | null)?.job_title || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Avatar
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar_url || undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security
  const [showPwCurrent, setShowPwCurrent] = useState(false)
  const [showPwNew, setShowPwNew] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [twoFactorOn, setTwoFactorOn] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)

  // Notifications
  const [notif, setNotif] = useState<Record<string, boolean>>(DEFAULT_NOTIF)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
      if (raw) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(raw) })
    } catch {/* ignore */}
  }, [])

  // Sessions (local)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
      setSessions(raw ? JSON.parse(raw) : seedSessions())
    } catch { setSessions(seedSessions()) }
  }, [])
  function saveSessions(next: SessionRow[]) {
    setSessions(next)
    try { localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next)) } catch {/* ignore */}
  }

  // Sync local edits when user object updates (e.g. after login)
  useEffect(() => {
    if (!user) return
    setFullName(user.full_name || '')
    setPhone(user.phone || '')
    setAvatar(user.avatar_url || undefined)
  }, [user?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  const department = useMemo(
    () => (user?.department_id ? DEMO_DEPARTMENTS.find(d => d.id === user.department_id) : undefined),
    [user?.department_id],
  )

  if (!user) {
    // The dashboard layout already routes unauthenticated visitors to /login,
    // so this is mostly defensive.
    return null
  }

  // ---------- Actions ----------

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { toast.error('Max 1 MB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      setAvatar(dataUrl)
      updateProfile({ avatar_url: dataUrl })
      toast.success(t.saved)
    }
    reader.readAsDataURL(file)
  }
  function handleAvatarRemove() {
    setAvatar(undefined)
    updateProfile({ avatar_url: undefined })
  }

  async function handleSavePersonal() {
    if (!user) return
    setSavingProfile(true)
    await new Promise(r => setTimeout(r, 400))
    updateProfile({ full_name: fullName.trim() || user.full_name, phone: phone.trim() })
    setSavingProfile(false)
    toast.success(t.saved)
  }

  async function handleChangePassword() {
    if (!pwCurrent) { toast.error(t.pwNeedsCurrent); return }
    if (pwNew.length < 12) { toast.error(t.pwShort); return }
    if (pwNew !== pwConfirm) { toast.error(t.pwMismatch); return }
    setSavingPw(true)
    await new Promise(r => setTimeout(r, 700))
    setSavingPw(false)
    setPwCurrent(''); setPwNew(''); setPwConfirm('')
    toast.success(t.pwChanged)
  }

  async function handleChangeUsername() {
    if (!newUsername.trim()) return
    setSavingUsername(true)
    await new Promise(r => setTimeout(r, 500))
    updateProfile({ username: newUsername.trim() })
    setNewUsername('')
    setSavingUsername(false)
    toast.success(t.usernameUpdated)
  }

  function toggleTwoFactor() {
    const next = !twoFactorOn
    setTwoFactorOn(next)
    toast(next ? t.twoFactorEnabled : t.twoFactorDisabled, { icon: next ? '🔐' : '⚠️' })
  }

  function saveNotifPrefs() {
    try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notif)) } catch {/* ignore */}
    toast.success(t.notifSaved)
  }

  function revokeSession(id: string) {
    saveSessions(sessions.filter(s => s.id !== id))
    toast.success(`Session revoked`)
  }

  // Permission summary (read role mapping)
  const role = user.role
  const access = [
    { key: 'accessAdmin' as keyof Translations,        granted: ['admin'].includes(role) },
    { key: 'accessResearch' as keyof Translations,     granted: ['admin','research_director','department_head','research_coordinator','authorized_staff'].includes(role) },
    { key: 'accessReports' as keyof Translations,      granted: ['admin','research_director','department_head','research_coordinator'].includes(role) },
    { key: 'accessFiles' as keyof Translations,        granted: ['admin','research_director','department_head','research_coordinator','authorized_staff'].includes(role) },
    { key: 'accessQr' as keyof Translations,           granted: ['admin','research_director','department_head','research_coordinator','authorized_staff'].includes(role) },
    { key: 'accessConfidential' as keyof Translations, granted: ['admin','research_director','department_head','research_coordinator'].includes(role) },
  ]

  const pwStrength = passwordStrength(pwNew)

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6">

      {/* ===== Profile header banner ===== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl text-white p-6 md:p-7"
        style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1e3a8a 55%, #1d4ed8 100%)' }}
      >
        <div className="home-hero-grid absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white text-blue-700 ring-4 ring-white/20 flex items-center justify-center overflow-hidden font-bold text-2xl">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(fullName || user.full_name)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -end-1 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md ring-2 ring-white"
              aria-label={t.avatarChange}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              {fullName || user.full_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-blue-100/85 text-sm">
              <span className="font-mono text-[12px] bg-white/10 px-2 py-0.5 rounded">{user.username}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {ROLE_LABELS[user.role]}
              </span>
              {department && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {department.name}
                  </span>
                </>
              )}
            </div>
            <p className="text-blue-100/70 text-xs mt-2">{t.pageSub}</p>
            {avatar && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="mt-3 text-[11px] text-blue-200 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {t.avatarRemove}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors backdrop-blur"
              aria-label="Toggle language"
            >
              <Languages className="w-4 h-4" />
              {t.languageBtn}
            </button>
            <button
              type="button"
              onClick={async () => { await logout(); window.location.assign('/login') }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-red-500/30 transition-colors backdrop-blur"
            >
              <LogOut className="w-4 h-4" />
              {t.revoke}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ===== Section tabs ===== */}
      <div className="premium-card p-1.5 inline-flex flex-wrap gap-1">
        {SECTION_DEFS.map(s => {
          const Icon = s.icon
          const active = section === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {t[s.key]}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ===================== PERSONAL ===================== */}
          {section === 'personal' && (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 premium-card p-6 space-y-5">
                <h2 className="font-bold text-gray-900">{t.sectionPersonal}</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t.fldFullName}>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" />
                  </Field>
                  <Field label={t.fldPhone}>
                    <div className="relative">
                      <Phone className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+966 5X XXX XXXX"
                        className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')}
                        dir="ltr"
                      />
                    </div>
                  </Field>
                  <Field label={t.fldEmail}>
                    <div className="relative">
                      <Mail className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
                      <input
                        value={user.email}
                        readOnly
                        className={cn('form-input bg-gray-50 text-gray-600 cursor-not-allowed', isRtl ? 'pe-9' : 'ps-9')}
                        dir="ltr"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{t.readonly}</p>
                  </Field>
                  <Field label={t.fldUsername}>
                    <input
                      value={user.username}
                      readOnly
                      className="form-input bg-gray-50 text-gray-600 cursor-not-allowed font-mono"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{t.readonly}</p>
                  </Field>
                  <Field label={t.fldJobTitle}>
                    <input
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="—"
                      className="form-input"
                    />
                  </Field>
                  <Field label={t.fldEmployeeId}>
                    <input
                      value={user.id}
                      readOnly
                      className="form-input bg-gray-50 text-gray-600 cursor-not-allowed font-mono"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{t.readonly}</p>
                  </Field>
                  <Field label={t.fldDepartment}>
                    <input
                      value={department?.name || '—'}
                      readOnly
                      className="form-input bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </Field>
                  <Field label={t.fldRole}>
                    <input
                      value={ROLE_LABELS[user.role]}
                      readOnly
                      className="form-input bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </Field>
                  <Field label={t.fldLanguage}>
                    <div className="flex items-center gap-2">
                      {(['en','ar'] as Lang[]).map(L => (
                        <button
                          key={L}
                          type="button"
                          onClick={() => setLang(L)}
                          className={cn(
                            'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors',
                            lang === L
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700',
                          )}
                        >
                          {L === 'en' ? t.langEn : t.langAr}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSavePersonal}
                    disabled={savingProfile}
                    className="btn-primary text-sm"
                  >
                    {savingProfile ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
                    {savingProfile ? t.saving : t.save}
                  </button>
                </div>
              </div>

              {/* Access overview side card */}
              <div className="premium-card p-6 space-y-3 self-start">
                <h2 className="font-bold text-gray-900">{t.accessTitle}</h2>
                <p className="text-xs text-gray-500">{t.accessSub}</p>
                <ul className="space-y-2 mt-2">
                  {access.map(a => (
                    <li key={a.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{t[a.key]}</span>
                      {a.granted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ===================== SECURITY ===================== */}
          {section === 'security' && (
            <div className="space-y-5">
              {/* Password */}
              <div className="premium-card p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-gray-900">{t.changePassword}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t.securityIntro}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <PwField
                    id="pw-current"
                    label={t.fldCurrentPassword}
                    value={pwCurrent}
                    onChange={setPwCurrent}
                    show={showPwCurrent}
                    onToggleShow={() => setShowPwCurrent(s => !s)}
                    isRtl={isRtl}
                  />
                  <PwField
                    id="pw-new"
                    label={t.fldNewPassword}
                    value={pwNew}
                    onChange={setPwNew}
                    show={showPwNew}
                    onToggleShow={() => setShowPwNew(s => !s)}
                    isRtl={isRtl}
                  />
                  <PwField
                    id="pw-confirm"
                    label={t.fldConfirmPassword}
                    value={pwConfirm}
                    onChange={setPwConfirm}
                    show={showPwConfirm}
                    onToggleShow={() => setShowPwConfirm(s => !s)}
                    isRtl={isRtl}
                  />
                </div>

                {pwNew && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-500">Strength</span>
                      <span className="font-bold" style={{ color: pwStrength.color }}>
                        {t[pwStrength.label]}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: pwStrength.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(pwStrength.score / 4) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={savingPw}
                    className="btn-primary text-sm"
                  >
                    {savingPw ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Key className="w-4 h-4" />}
                    {savingPw ? t.changingPassword : t.changePassword}
                  </button>
                </div>
              </div>

              {/* 2FA */}
              <div className="premium-card p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">{t.twoFactorTitle}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-md">{t.twoFactorSub}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTwoFactor}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                    twoFactorOn
                      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700',
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  {twoFactorOn ? t.twoFactorDisable : t.twoFactorEnable}
                </button>
              </div>

              {/* Change username */}
              <div className="premium-card p-6 space-y-3">
                <div>
                  <h2 className="font-bold text-gray-900">{t.changeUsernameTitle}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t.changeUsernameSub}</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Field label={t.fldNewUsername}>
                      <input
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder={user.username}
                        className="form-input font-mono"
                        dir="ltr"
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangeUsername}
                    disabled={savingUsername || !newUsername.trim()}
                    className="btn-secondary text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {t.updateUsername}
                  </button>
                </div>
              </div>

              {/* Sessions */}
              <div className="premium-card p-6">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-gray-900">{t.sessions}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t.sessionsSub}</p>
                <ul className="mt-4 space-y-2">
                  {sessions.map(s => (
                    <li
                      key={s.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        s.current ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
                          {s.device}
                          {s.current && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              {t.currentSession}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          <span className="font-mono">{s.ip}</span>
                          <span className="mx-1.5" aria-hidden>·</span>
                          {timeAgo(s.lastActive)}
                        </p>
                      </div>
                      {!s.current && (
                        <button
                          type="button"
                          onClick={() => revokeSession(s.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold inline-flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t.revoke}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ===================== NOTIFICATIONS ===================== */}
          {section === 'notifications' && (
            <div className="premium-card p-6 space-y-6">
              <div>
                <h2 className="font-bold text-gray-900">{t.sectionNotifications}</h2>
                <p className="text-xs text-gray-500 mt-1">{t.notifIntro}</p>
              </div>

              {(['email', 'sms', 'inapp'] as const).map(channel => {
                const channelLabel = channel === 'email' ? t.notifEmail : channel === 'sms' ? t.notifSms : t.notifInApp
                const channelIcon = channel === 'email' ? Mail : channel === 'sms' ? Smartphone : Bell
                const Icon = channelIcon
                const items = NOTIF_KEYS.filter(n => n.channel === channel)
                if (items.length === 0) return null
                return (
                  <div key={channel}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-blue-700" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">{channelLabel}</p>
                    </div>
                    <div className="space-y-2">
                      {items.map(item => (
                        <label
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{t[item.label]}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!!notif[item.id]}
                            onClick={() => setNotif(n => ({ ...n, [item.id]: !n[item.id] }))}
                            className={cn(
                              'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                              notif[item.id] ? 'bg-blue-600' : 'bg-gray-300',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                                notif[item.id] ? 'start-6' : 'start-1',
                              )}
                            />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={saveNotifPrefs} className="btn-primary text-sm">
                  <Save className="w-4 h-4" />
                  {t.notifSave}
                </button>
              </div>
            </div>
          )}

          {/* ===================== ACTIVITY ===================== */}
          {section === 'activity' && (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 premium-card p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-gray-900">{t.activityTitle}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t.activitySub}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric icon={Activity} label={t.metricLogins} value={user.login_count?.toString() || '0'} color="blue" />
                  <Metric
                    icon={Clock}
                    label={t.metricLastLogin}
                    value={user.last_login ? formatDate(user.last_login) : '—'}
                    color="purple"
                  />
                  <Metric
                    icon={user.is_active ? CheckCircle : AlertCircle}
                    label={t.metricStatus}
                    value={user.is_active ? t.statusActive : t.statusInactive}
                    color={user.is_active ? 'green' : 'orange'}
                  />
                  <Metric
                    icon={Sun}
                    label={t.metricMember}
                    value={user.created_at ? formatDate(user.created_at) : '—'}
                    color="amber"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Live data from your Supabase profile row.
                  </p>
                </div>
              </div>

              <div className="premium-card p-6 space-y-3">
                <h2 className="font-bold text-gray-900">{t.accessTitle}</h2>
                <ul className="space-y-2 mt-1">
                  {access.map(a => (
                    <li key={a.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{t[a.key]}</span>
                      {a.granted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// --------------- Small subcomponents ---------------

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

function PwField({
  id, label, value, onChange, show, onToggleShow, isRtl,
}: {
  id: string
  label: string
  value: string
  onChange: (s: string) => void
  show: boolean
  onToggleShow: () => void
  isRtl: boolean
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Lock className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
          className={cn('form-input', isRtl ? 'pe-10 ps-9' : 'ps-9 pe-10')}
          dir="ltr"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600',
            isRtl ? 'left-3' : 'right-3',
          )}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  )
}

function Metric({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'blue' | 'purple' | 'green' | 'orange' | 'amber'
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-3 flex items-start gap-2.5 border',
        color === 'blue'   && 'bg-blue-50/60 border-blue-100',
        color === 'purple' && 'bg-purple-50/60 border-purple-100',
        color === 'green'  && 'bg-emerald-50/60 border-emerald-100',
        color === 'orange' && 'bg-orange-50/60 border-orange-100',
        color === 'amber'  && 'bg-amber-50/60 border-amber-100',
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          color === 'blue'   && 'bg-blue-100 text-blue-700',
          color === 'purple' && 'bg-purple-100 text-purple-700',
          color === 'green'  && 'bg-emerald-100 text-emerald-700',
          color === 'orange' && 'bg-orange-100 text-orange-700',
          color === 'amber'  && 'bg-amber-100 text-amber-700',
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )
}
