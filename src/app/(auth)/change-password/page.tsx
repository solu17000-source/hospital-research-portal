'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff, Key, Languages,
  Lock, LogOut, ShieldCheck, Sparkles,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'

type Lang = 'en' | 'ar'

const T = {
  en: {
    pageTitle: 'Set a new password',
    pageSubForced:
      'For security, your administrator requires you to set a new password before continuing.',
    pageSubVoluntary:
      'Choose a strong password. Minimum 12 characters with letters, numbers and a symbol.',
    welcome: 'Signed in as {name}',
    role: 'Role',
    languageBtn: 'العربية',
    logout: 'Sign out instead',
    fldNewPassword: 'New password',
    fldConfirmPassword: 'Confirm new password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    strengthLabel: 'Password strength',
    strengthWeak: 'Weak',
    strengthFair: 'Fair',
    strengthGood: 'Good',
    strengthStrong: 'Strong',
    requirements: 'Requirements',
    reqLength: 'At least 12 characters',
    reqUpper: 'Uppercase and lowercase letters',
    reqDigit: 'At least one number',
    reqSymbol: 'At least one symbol (! @ # $ %)',
    reqNotInitial: 'Different from the temporary password',
    save: 'Update password & continue',
    saving: 'Updating…',
    pwShort: 'Password must be at least 12 characters.',
    pwMissingClasses: 'Password must mix letters, numbers and at least one symbol.',
    pwMismatch: 'Passwords do not match.',
    pwSameAsInitial: 'New password must be different from the initial temporary password.',
    pwUpdated: 'Password updated. Welcome aboard.',
    initialNotice: 'Initial temporary password detected — change it to continue.',
  },
  ar: {
    pageTitle: 'تعيين كلمة مرور جديدة',
    pageSubForced:
      'لأسباب أمنية، يتطلب المسؤول تعيين كلمة مرور جديدة قبل المتابعة.',
    pageSubVoluntary:
      'اختر كلمة مرور قوية. 12 حرفًا على الأقل، تشمل حروفًا وأرقامًا ورمزًا.',
    welcome: 'تم تسجيل الدخول كـ {name}',
    role: 'الدور',
    languageBtn: 'English',
    logout: 'تسجيل الخروج بدلًا من ذلك',
    fldNewPassword: 'كلمة المرور الجديدة',
    fldConfirmPassword: 'تأكيد كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    strengthLabel: 'قوة كلمة المرور',
    strengthWeak: 'ضعيفة',
    strengthFair: 'متوسطة',
    strengthGood: 'جيدة',
    strengthStrong: 'قوية',
    requirements: 'المتطلبات',
    reqLength: '12 حرفًا على الأقل',
    reqUpper: 'حروف كبيرة وصغيرة',
    reqDigit: 'رقم واحد على الأقل',
    reqSymbol: 'رمز واحد على الأقل (! @ # $ %)',
    reqNotInitial: 'تختلف عن كلمة المرور المؤقتة',
    save: 'تحديث كلمة المرور والمتابعة',
    saving: 'جاري التحديث…',
    pwShort: 'يجب أن تكون 12 حرفًا على الأقل.',
    pwMissingClasses: 'يجب أن تشمل حروفًا وأرقامًا ورمزًا.',
    pwMismatch: 'كلمتا المرور غير متطابقتين.',
    pwSameAsInitial: 'يجب أن تختلف عن كلمة المرور المؤقتة الأولية.',
    pwUpdated: 'تم تحديث كلمة المرور. أهلًا بك.',
    initialNotice: 'تم اكتشاف كلمة المرور المؤقتة — يرجى تغييرها للمتابعة.',
  },
} as const

const INITIAL_TEMP_PASSWORDS = new Set([
  'ASas123456ASas',
  'PMNH@Research2024!',
])

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}
function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function passwordStrength(pw: string): { score: 0|1|2|3|4; label: keyof (typeof T)['en']; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++
  const cap = Math.min(4, score) as 0|1|2|3|4
  const buckets = [
    { label: 'strengthWeak'   as const, color: '#ef4444' },
    { label: 'strengthWeak'   as const, color: '#f97316' },
    { label: 'strengthFair'   as const, color: '#f59e0b' },
    { label: 'strengthGood'   as const, color: '#3b82f6' },
    { label: 'strengthStrong' as const, color: '#16a34a' },
  ]
  return { score: cap, ...buckets[cap] }
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  // The forced-on-first-login flow was retired (password is now fixed).
  // Keep the page around for voluntary changes, but the "must change" banner
  // is always off.
  const mustChangePassword = false
  const clearMustChangePassword = () => {/* no-op */}

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const t = T[lang]
  const isRtl = lang === 'ar'

  // Bounce unauthenticated visitors to login. We keep this client-side because
  // the password change happens after the auth-store has already authenticated
  // the user; middleware can't see the Zustand state.
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = passwordStrength(pwNew)

  const checks = {
    length: pwNew.length >= 12,
    upper:  /[A-Z]/.test(pwNew) && /[a-z]/.test(pwNew),
    digit:  /\d/.test(pwNew),
    symbol: /[^\w\s]/.test(pwNew),
    notInitial: pwNew.length > 0 && !INITIAL_TEMP_PASSWORDS.has(pwNew),
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pwNew.length < 12) { setError(t.pwShort); return }
    if (!checks.upper || !checks.digit || !checks.symbol) { setError(t.pwMissingClasses); return }
    if (INITIAL_TEMP_PASSWORDS.has(pwNew)) { setError(t.pwSameAsInitial); return }
    if (pwNew !== pwConfirm) { setError(t.pwMismatch); return }

    setSaving(true)
    // In demo mode we have no real auth backend, so we just acknowledge the
    // change and clear the must-change flag. Once Supabase is wired this will
    // call supabase.auth.updateUser({ password: pwNew }).
    await new Promise(r => setTimeout(r, 600))
    clearMustChangePassword()
    setSaving(false)
    toast.success(t.pwUpdated)
    router.replace('/dashboard')
  }

  if (!user) return null

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={lang}
      className="min-h-screen home-hero text-white relative overflow-hidden flex flex-col"
    >
      <div className="home-hero-grid absolute inset-0 opacity-50" aria-hidden />
      <div className="absolute top-1/4 -left-32 w-[28rem] h-[28rem] bg-blue-500/25 rounded-full blur-3xl" aria-hidden />
      <div className="absolute bottom-1/4 -right-24 w-[22rem] h-[22rem] bg-indigo-500/20 rounded-full blur-3xl" aria-hidden />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100/85 hover:text-white transition-colors">
            <ShieldCheck className="w-4 h-4" />
            <span>PMNH Research</span>
          </Link>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-100/85 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Toggle language"
            >
              <Languages className="w-4 h-4" />
              {t.languageBtn}
            </button>
            <button
              type="button"
              onClick={async () => { await logout(); router.replace('/login') }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-100/85 hover:bg-red-500/20 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-xl"
        >
          {/* Identity card */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-2xl bg-white/95 backdrop-blur ring-1 ring-white/40">
              <Key className="w-7 h-7 text-blue-700" />
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{t.pageTitle}</h1>
            <p className="text-blue-100/85 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              {mustChangePassword ? t.pageSubForced : t.pageSubVoluntary}
            </p>
            <p className="text-blue-200/70 text-xs mt-3">
              {format(t.welcome, { name: user.full_name })}
              <span className="mx-2" aria-hidden>·</span>
              {t.role}: <span className="font-semibold">{ROLE_LABELS[user.role]}</span>
            </p>
          </div>

          {mustChangePassword && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl text-xs"
                 style={{ background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.30)' }}>
              <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <span className="text-amber-100">{t.initialNotice}</span>
            </div>
          )}

          {/* Form card */}
          <form onSubmit={handleSubmit} className="glass-dark p-7 shadow-2xl space-y-5">
            <PwField
              id="pw-new"
              label={t.fldNewPassword}
              value={pwNew}
              onChange={setPwNew}
              show={showNew}
              onToggleShow={() => setShowNew(s => !s)}
              isRtl={isRtl}
              showHide={t.showPassword}
              hideHide={t.hidePassword}
              autoFocus
            />
            <PwField
              id="pw-confirm"
              label={t.fldConfirmPassword}
              value={pwConfirm}
              onChange={setPwConfirm}
              show={showConfirm}
              onToggleShow={() => setShowConfirm(s => !s)}
              isRtl={isRtl}
              showHide={t.showPassword}
              hideHide={t.hidePassword}
            />

            {/* Strength meter */}
            {pwNew && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-blue-100/70 font-semibold uppercase tracking-wider">{t.strengthLabel}</span>
                  <span className="font-bold" style={{ color: strength.color }}>{t[strength.label]}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: strength.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(strength.score / 4) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Requirements checklist */}
            <div>
              <p className="text-[11px] font-bold text-blue-100/80 uppercase tracking-wider mb-2">{t.requirements}</p>
              <ul className="space-y-1.5 text-xs">
                <ReqRow ok={checks.length}     label={t.reqLength} />
                <ReqRow ok={checks.upper}      label={t.reqUpper}  />
                <ReqRow ok={checks.digit}      label={t.reqDigit}  />
                <ReqRow ok={checks.symbol}     label={t.reqSymbol} />
                <ReqRow ok={checks.notInitial} label={t.reqNotInitial} />
              </ul>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                  <span className="text-red-200 leading-relaxed">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}
            >
              {saving ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{t.save}</span>
                  <ArrowRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  )
}

function PwField({
  id, label, value, onChange, show, onToggleShow, isRtl, showHide, hideHide, autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (s: string) => void
  show: boolean
  onToggleShow: () => void
  isRtl: boolean
  showHide: string
  hideHide: string
  autoFocus?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-bold text-blue-100/90 mb-2 uppercase tracking-[0.12em]"
      >
        {label}
      </label>
      <div className="relative">
        <Lock className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/70', isRtl ? 'right-3.5' : 'left-3.5')} />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          dir="ltr"
          className={cn(
            'w-full py-3 rounded-xl text-white placeholder:text-blue-200/40 text-sm font-medium',
            'bg-white/[0.06] border border-white/15',
            'focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300/50 transition-all',
            isRtl ? 'pe-10 ps-12 text-right' : 'ps-10 pe-12',
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cn('absolute top-1/2 -translate-y-1/2 text-blue-200/70 hover:text-white transition-colors', isRtl ? 'left-3.5' : 'right-3.5')}
          aria-label={show ? hideHide : showHide}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function ReqRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-white/30 flex-shrink-0" />
      )}
      <span className={cn(ok ? 'text-emerald-100/90' : 'text-blue-100/70')}>{label}</span>
    </li>
  )
}
