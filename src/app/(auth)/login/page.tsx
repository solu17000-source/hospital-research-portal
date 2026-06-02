'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertCircle, ArrowLeft, ArrowRight, ChevronRight, Eye, EyeOff,
  Globe, Languages, Lock, ShieldCheck, Sparkles, User as UserIcon,
} from 'lucide-react'

import { useAuthStore, type LoginResult } from '@/lib/auth-store'
import { isDemoMode } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Lang = 'en' | 'ar'

const T = {
  en: {
    backHome: 'Back to home',
    languageBtn: 'العربية',
    unitName: 'Health & Nursing Research Unit',
    hospital: 'Prince Mohammed Bin Nasser Hospital',
    location: 'Jazan · Kingdom of Saudi Arabia',
    cardTitle: 'Secure Portal Sign-in',
    cardSub: 'Authorized personnel only — all access is logged.',
    identifier: 'Username or Email',
    identifierPlaceholder: 'e.g. sultan.alallah or you@hospital.gov.sa',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    capsLock: 'Caps Lock is ON',
    rememberMe: 'Remember my username on this device',
    submit: 'Sign in to Research Portal',
    submitting: 'Authenticating…',
    forgotPassword: 'Forgot password?',
    orDivider: 'or',
    continueAsVisitor: 'Continue as Visitor',
    visitorSub: 'Browse approved public research without an account',
    footerSecurity: 'Confidential institutional system.',
    footerRights: '© {year} PMNH Research Portal · Jazan, Saudi Arabia',
    demoHintTitle: 'Demo mode',
    demoHintBody:
      'Try {creds} (password: {pw}). Other demo accounts use password "demo".',
    errors: {
      missing_fields: 'Please enter your username and password.',
      invalid_credentials: 'Invalid username or password.',
      account_locked: 'This account is temporarily locked. Contact an administrator.',
      account_inactive: 'This account is inactive. Contact an administrator.',
      account_pending: 'This account is pending approval.',
      network: 'Network error — please try again.',
      unknown: 'Something went wrong. Please try again.',
    } as const,
    welcomeBack: 'Welcome back, {name}',
    firstLoginNotice: 'For security, please change your temporary password.',
  },
  ar: {
    backHome: 'العودة إلى الرئيسية',
    languageBtn: 'English',
    unitName: 'وحدة الأبحاث الصحية والتمريضية',
    hospital: 'مستشفى الأمير محمد بن ناصر',
    location: 'جازان · المملكة العربية السعودية',
    cardTitle: 'تسجيل دخول آمن للبوابة',
    cardSub: 'مخصص للموظفين المصرح لهم — جميع عمليات الدخول مسجلة.',
    identifier: 'اسم المستخدم أو البريد الإلكتروني',
    identifierPlaceholder: 'مثل: sultan.alallah أو you@hospital.gov.sa',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    capsLock: 'مفتاح Caps Lock مُفعّل',
    rememberMe: 'تذكر اسم المستخدم على هذا الجهاز',
    submit: 'الدخول إلى بوابة الأبحاث',
    submitting: 'جاري التحقق…',
    forgotPassword: 'نسيت كلمة المرور؟',
    orDivider: 'أو',
    continueAsVisitor: 'الدخول كزائر',
    visitorSub: 'تصفح الأبحاث العامة المعتمدة دون الحاجة إلى حساب',
    footerSecurity: 'نظام مؤسسي سري.',
    footerRights: '© {year} بوابة أبحاث المستشفى · جازان، المملكة العربية السعودية',
    demoHintTitle: 'الوضع التجريبي',
    demoHintBody:
      'جرّب {creds} (كلمة المرور: {pw}). الحسابات التجريبية الأخرى تستخدم كلمة المرور "demo".',
    errors: {
      missing_fields: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
      invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
      account_locked: 'الحساب مغلق مؤقتًا. يرجى التواصل مع المسؤول.',
      account_inactive: 'هذا الحساب غير مفعّل. يرجى التواصل مع المسؤول.',
      account_pending: 'هذا الحساب في انتظار الموافقة.',
      network: 'خطأ في الشبكة — يرجى المحاولة مرة أخرى.',
      unknown: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    } as const,
    welcomeBack: 'مرحبًا بعودتك، {name}',
    firstLoginNotice: 'لأسباب أمنية، يرجى تغيير كلمة المرور المؤقتة الآن.',
  },
} as const

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/dashboard'

  const { login, isAuthenticated, isLoading, lastIdentifier } = useAuthStore()

  const [lang, setLang] = useState<Lang>('en')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [capsLock, setCapsLock] = useState(false)
  const [errorCode, setErrorCode] = useState<keyof (typeof T)['en']['errors'] | null>(null)
  const [_isPending, startTransition] = useTransition()

  // Initial state from cookie / persisted username.
  useEffect(() => {
    setLang(readLangCookie())
  }, [])
  useEffect(() => {
    if (lastIdentifier) setIdentifier(lastIdentifier)
  }, [lastIdentifier])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  // If user is already signed in, send them straight to their target.
  // The first-login "must change password" redirect was removed — the
  // password is now a fixed value and there's no temporary credential to swap.
  useEffect(() => {
    if (isAuthenticated) router.replace(redirectTo)
  }, [isAuthenticated, redirectTo, router])

  const t = T[lang]
  const isRtl = lang === 'ar'

  const errorMessage = useMemo(() => (errorCode ? t.errors[errorCode] : null), [errorCode, t])

  function handleKeyEvent(e: React.KeyboardEvent<HTMLInputElement>) {
    // KeyboardEvent#getModifierState is supported in all evergreen browsers.
    const on = typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')
    setCapsLock(on)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorCode(null)
    const result: LoginResult = await login(identifier, password, { remember: rememberMe })
    if (result.success) {
      // A successful sign-in supersedes any active visitor session.
      document.cookie = 'pmnh-visitor=; path=/; max-age=0'
      const name = (result.user?.full_name || identifier).split(' ')[0]
      toast.success(format(t.welcomeBack, { name }))
      // First-login force-change-password flow was removed — go straight to
      // the requested page (defaults to /dashboard).
      startTransition(() => router.replace(redirectTo))
      return
    }
    setErrorCode(result.errorCode ?? 'unknown')
  }

  // --------- demo credentials hint (only when in demo mode) ---------
  const demoCredsHint = (
    <div
      className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
      style={{ background: 'rgba(96, 165, 250, 0.10)', border: '1px solid rgba(96, 165, 250, 0.25)' }}
    >
      <Sparkles className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
      <div className="text-blue-100/85 leading-relaxed">
        <span className="font-bold text-blue-200">{t.demoHintTitle} · </span>
        {format(t.demoHintBody, {
          creds: 'sultan.alallah / afnan.bakri',
          pw: 'ASas123456ASas',
        })}
      </div>
    </div>
  )

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100/85 hover:text-white transition-colors"
          >
            <ArrowLeft className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
            {t.backHome}
          </Link>

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-100/85 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
            <span>{t.languageBtn}</span>
          </button>
        </div>
      </header>

      {/* Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Brand block */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl bg-white/95 backdrop-blur ring-1 ring-white/40"
            >
              <img
                src="/jazan-health-cluster.jpg"
                alt="Jazan Health Cluster"
                className="w-14 h-14 object-contain"
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
              />
            </motion.div>
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {t.unitName}
            </h1>
            <p className="text-blue-100/85 text-sm mt-1 font-medium">{t.hospital}</p>
            <p className="text-blue-200/70 text-xs mt-0.5">{t.location}</p>
          </div>

          {/* Glass form card */}
          <div className="glass-dark p-7 shadow-2xl">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-300" />
                <h2 className="text-white font-bold text-base">{t.cardTitle}</h2>
              </div>
              <p className="text-blue-100/70 text-xs mt-1.5 leading-relaxed">{t.cardSub}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Identifier */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-[11px] font-bold text-blue-100/90 mb-2 uppercase tracking-[0.12em]"
                >
                  {t.identifier}
                </label>
                <div className="relative">
                  <UserIcon
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/70',
                      isRtl ? 'right-3.5' : 'left-3.5',
                    )}
                  />
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={t.identifierPlaceholder}
                    autoComplete="username"
                    autoFocus
                    spellCheck={false}
                    dir="ltr"
                    className={cn(
                      'w-full py-3 rounded-xl text-white placeholder:text-blue-200/40 text-sm font-medium',
                      'bg-white/[0.06] border border-white/15',
                      'focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-300/50 transition-all',
                      isRtl ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4',
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold text-blue-100/90 mb-2 uppercase tracking-[0.12em]"
                >
                  {t.password}
                </label>
                <div className="relative">
                  <Lock
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/70',
                      isRtl ? 'right-3.5' : 'left-3.5',
                    )}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                    placeholder={t.passwordPlaceholder}
                    autoComplete="current-password"
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
                    onClick={() => setShowPassword(s => !s)}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 text-blue-200/70 hover:text-white transition-colors',
                      isRtl ? 'left-3.5' : 'right-3.5',
                    )}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {capsLock && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-200"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {t.capsLock}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember me + forgot */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <label className="inline-flex items-center gap-2 text-blue-100/85 hover:text-white cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-300/40 focus:ring-offset-0"
                  />
                  <span className="font-medium">{t.rememberMe}</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-blue-200/85 hover:text-white font-semibold transition-colors whitespace-nowrap"
                >
                  {t.forgotPassword}
                </Link>
              </div>

              {/* Error */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                    <span className="text-red-200 leading-relaxed">{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Demo hint (only in demo mode) */}
              {isDemoMode && demoCredsHint}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
                }}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <span>{t.submit}</span>
                    <ArrowRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3" aria-hidden>
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-blue-100/60 font-bold">
                {t.orDivider}
              </span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            {/* Continue as Visitor */}
            <Link
              href="/visitor"
              onClick={() => {
                // Set the visitor cookie before navigating so middleware sees it
                // on the next request and gates protected routes for this session.
                document.cookie = `pmnh-visitor=1; path=/; max-age=${60 * 60 * 8}; samesite=lax`
              }}
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors border border-white/25 bg-white/[0.06] hover:bg-white/15 text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t.continueAsVisitor}
                <ChevronRight className={cn('w-4 h-4 opacity-70', isRtl && 'flip-rtl')} />
              </span>
            </Link>
            <p className="text-[11px] text-blue-200/70 text-center mt-2">{t.visitorSub}</p>
          </div>

          {/* Footer line */}
          <p className="text-center text-blue-200/55 text-[11px] mt-6">
            {t.footerSecurity}{' '}
            <span className="text-blue-200/40">·</span>{' '}
            {format(t.footerRights, { year: new Date().getFullYear() })}
          </p>
        </motion.div>
      </main>
    </div>
  )
}
