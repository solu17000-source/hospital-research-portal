'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Activity, ArrowLeft, CheckCircle, Languages, Mail, Phone, ShieldCheck,
} from 'lucide-react'

import { format, useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Step = 'method' | 'verify' | 'input' | 'success'
type Method = 'email' | 'phone'

const DICT = {
  en: {
    title: 'Account recovery',
    sub: 'PMNH Research Portal',
    languageBtn: 'العربية',
    methodTitle: 'Reset password',
    methodSub: 'Choose how to receive your verification code.',
    methodEmail: 'Email address',
    methodEmailSub: 'Send the code to your registered email',
    methodPhone: 'Mobile number',
    methodPhoneSub: 'Send a one-time code via SMS',
    continueBtn: 'Continue',
    verifyTitle: 'Enter the verification code',
    verifySubEmail: 'A 6-digit code was sent to your email.',
    verifySubPhone: 'A 6-digit code was sent to your mobile number.',
    verifyDemo: 'Demo mode: any 6 digits will be accepted.',
    verifyBtn: 'Verify code',
    verifyIncomplete: 'Enter all 6 digits to continue.',
    verifyOk: 'Code verified.',
    inputTitle: 'Create a new password',
    inputSub: 'Pick a strong password — at least 8 characters.',
    inputNew: 'New password',
    inputNewPh: 'Min. 8 characters',
    inputConfirm: 'Confirm password',
    inputConfirmPh: 'Repeat your password',
    inputBtn: 'Reset password',
    inputShort: 'Password must be at least 8 characters.',
    inputMismatch: 'Passwords do not match.',
    inputDone: 'Password updated successfully.',
    successTitle: 'Password reset!',
    successSub: 'Your password has been updated. Sign in with the new password.',
    successBtn: 'Back to login',
    back: 'Back to login',
    sending: 'Sending…',
    sentEmail: 'Verification code sent to your email.',
    sentPhone: 'Verification code sent via SMS.',
  },
  ar: {
    title: 'استعادة الحساب',
    sub: 'بوابة الأبحاث في مستشفى الأمير محمد بن ناصر',
    languageBtn: 'English',
    methodTitle: 'إعادة تعيين كلمة المرور',
    methodSub: 'اختر طريقة استلام رمز التحقق.',
    methodEmail: 'البريد الإلكتروني',
    methodEmailSub: 'إرسال الرمز إلى بريدك المسجل',
    methodPhone: 'رقم الجوال',
    methodPhoneSub: 'إرسال رمز لمرة واحدة عبر SMS',
    continueBtn: 'متابعة',
    verifyTitle: 'أدخل رمز التحقق',
    verifySubEmail: 'تم إرسال رمز مكون من 6 أرقام إلى بريدك.',
    verifySubPhone: 'تم إرسال رمز مكون من 6 أرقام إلى جوالك.',
    verifyDemo: 'وضع تجريبي: أي 6 أرقام مقبولة.',
    verifyBtn: 'تحقق من الرمز',
    verifyIncomplete: 'أدخل جميع الأرقام الستة للمتابعة.',
    verifyOk: 'تم التحقق من الرمز.',
    inputTitle: 'إنشاء كلمة مرور جديدة',
    inputSub: 'اختر كلمة مرور قوية — 8 أحرف على الأقل.',
    inputNew: 'كلمة المرور الجديدة',
    inputNewPh: '8 أحرف كحد أدنى',
    inputConfirm: 'تأكيد كلمة المرور',
    inputConfirmPh: 'أعد إدخال كلمة المرور',
    inputBtn: 'إعادة تعيين كلمة المرور',
    inputShort: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    inputMismatch: 'كلمتا المرور غير متطابقتين.',
    inputDone: 'تم تحديث كلمة المرور بنجاح.',
    successTitle: 'تم إعادة التعيين!',
    successSub: 'تم تحديث كلمة المرور. سجل الدخول باستخدام كلمة المرور الجديدة.',
    successBtn: 'العودة إلى تسجيل الدخول',
    back: 'العودة إلى تسجيل الدخول',
    sending: 'جاري الإرسال…',
    sentEmail: 'تم إرسال رمز التحقق إلى بريدك.',
    sentPhone: 'تم إرسال رمز التحقق عبر SMS.',
  },
} as const

export default function ForgotPasswordPage() {
  const { lang, isRtl, toggle, t } = useLang(DICT)

  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method>('email')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSendCode() {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setIsLoading(false)
    setStep('verify')
    toast.success(method === 'email' ? t.sentEmail : t.sentPhone)
  }

  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length !== 6) { toast.error(t.verifyIncomplete); return }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 700))
    setIsLoading(false)
    toast.success(t.verifyOk)
    setStep('input')
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) { toast.error(t.inputShort); return }
    if (newPassword !== confirmPassword) { toast.error(t.inputMismatch); return }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setIsLoading(false)
    setStep('success')
    toast.success(t.inputDone)
  }

  function handleOtpChange(index: number, val: string) {
    if (val.length > 1) return
    const next = [...otp]
    next[index] = val
    setOtp(next)
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

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
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100/85 hover:text-white transition-colors"
          >
            <ArrowLeft className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
            {t.back}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="ms-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-100/85 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
            <span>{t.languageBtn}</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 bg-white/95 ring-1 ring-white/40 shadow-2xl">
              <ShieldCheck className="w-8 h-8 text-blue-700" />
            </div>
            <h1 className="text-lg font-bold text-white">{t.title}</h1>
            <p className="text-blue-200/70 text-xs mt-1">{t.sub}</p>
          </div>

          <div className="glass-dark p-7 shadow-2xl">
            <AnimatePresence mode="wait">

              {/* --- Step: method --- */}
              {step === 'method' && (
                <motion.div key="method" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-white font-bold text-lg mb-2">{t.methodTitle}</h2>
                  <p className="text-blue-200/70 text-sm mb-6">{t.methodSub}</p>

                  <div className="space-y-3 mb-6">
                    {([
                      { key: 'email' as Method, icon: Mail,  label: t.methodEmail, sub: t.methodEmailSub },
                      { key: 'phone' as Method, icon: Phone, label: t.methodPhone, sub: t.methodPhoneSub },
                    ]).map(opt => {
                      const Icon = opt.icon
                      const active = method === opt.key
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMethod(opt.key)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-xl transition-all border text-start',
                            active ? 'border-blue-400/60 bg-blue-500/20' : 'border-white/15 bg-white/5 hover:border-white/30',
                          )}
                        >
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            active ? 'bg-blue-500/30' : 'bg-white/10',
                          )}>
                            <Icon className="w-5 h-5 text-blue-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{opt.label}</p>
                            <p className="text-blue-200/60 text-xs">{opt.sub}</p>
                          </div>
                          {active && <CheckCircle className="w-5 h-5 text-blue-300 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
                  >
                    {isLoading ? t.sending : t.continueBtn}
                  </button>
                </motion.div>
              )}

              {/* --- Step: verify --- */}
              {step === 'verify' && (
                <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-white font-bold text-lg mb-2">{t.verifyTitle}</h2>
                  <p className="text-blue-200/75 text-sm mb-1.5">
                    {method === 'email' ? t.verifySubEmail : t.verifySubPhone}
                  </p>
                  <p className="text-blue-300/70 text-xs mb-6">{t.verifyDemo}</p>

                  <div className="flex gap-2 justify-center mb-6" dir="ltr">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        className="w-11 h-13 text-center text-white font-bold text-lg rounded-xl bg-white/[0.08] border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
                  >
                    {isLoading ? t.sending : t.verifyBtn}
                  </button>
                </motion.div>
              )}

              {/* --- Step: input --- */}
              {step === 'input' && (
                <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-white font-bold text-lg mb-2">{t.inputTitle}</h2>
                  <p className="text-blue-200/75 text-sm mb-6">{t.inputSub}</p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-100/90 mb-1.5 uppercase tracking-[0.12em]">
                        {t.inputNew}
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder={t.inputNewPh}
                        className="w-full px-4 py-3 rounded-xl text-white placeholder:text-blue-200/40 text-sm bg-white/[0.06] border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-100/90 mb-1.5 uppercase tracking-[0.12em]">
                        {t.inputConfirm}
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t.inputConfirmPh}
                        className="w-full px-4 py-3 rounded-xl text-white placeholder:text-blue-200/40 text-sm bg-white/[0.06] border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-300/40 transition-all"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
                  >
                    {isLoading ? t.sending : t.inputBtn}
                  </button>
                </motion.div>
              )}

              {/* --- Step: success --- */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-300" />
                  </div>
                  <h2 className="text-white font-bold text-lg mb-2">{t.successTitle}</h2>
                  <p className="text-blue-200/75 text-sm mb-6">{t.successSub}</p>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  >
                    {t.successBtn}
                  </Link>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="text-center text-blue-200/55 text-[11px] mt-6">
            <Activity className="w-3 h-3 inline-block me-1" />
            {format('© {year} PMNH Research Portal', { year: new Date().getFullYear() })}
          </p>
        </motion.div>
      </main>
    </div>
  )
}
