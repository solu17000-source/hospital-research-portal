'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, ArrowLeft, CheckCircle, Send, Activity, Shield } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type Step = 'method' | 'input' | 'verify' | 'success'
type Method = 'email' | 'phone'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method>('email')
  const [value, setValue] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSendCode = async () => {
    if (!value.trim()) return
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsLoading(false)
    setStep('verify')
    toast.success(`Verification code sent via ${method === 'email' ? 'email' : 'SMS'}`)
  }

  const handleVerifyOtp = async () => {
    const code = otp.join('')
    if (code.length !== 6) { toast.error('Please enter the complete 6-digit code'); return }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsLoading(false)
    if (code === '123456' || true) { // Demo: any code works
      toast.success('Code verified successfully')
      setStep('input')
    }
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setIsLoading(false)
    setStep('success')
    toast.success('Password reset successfully!')
  }

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = val
    setOtp(newOtp)
    if (val && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`)
      next?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2460 30%, #1e3a8a 60%, #1d4ed8 100%)' }}>

      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Account Recovery</h1>
          <p className="text-blue-200/60 text-xs mt-1">PMNH Research Portal</p>
        </div>

        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}>

          <AnimatePresence mode="wait">
            {/* Step: Choose method */}
            {step === 'method' && (
              <motion.div key="method" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-white font-bold text-lg mb-2">Reset Password</h2>
                <p className="text-blue-200/70 text-sm mb-6">Choose how to receive your verification code</p>

                <div className="space-y-3 mb-6">
                  {[
                    { key: 'email' as Method, icon: Mail, label: 'Email Address', desc: 'Send code to your registered email' },
                    { key: 'phone' as Method, icon: Phone, label: 'Mobile Number', desc: 'Send OTP via SMS' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setMethod(opt.key)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${method === opt.key ? 'border-2 border-blue-400/60' : 'border border-white/15 hover:border-white/30'}`}
                      style={{ background: method === opt.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: method === opt.key ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)' }}>
                        <opt.icon className="w-5 h-5 text-blue-300" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-semibold text-sm">{opt.label}</p>
                        <p className="text-blue-200/60 text-xs">{opt.desc}</p>
                      </div>
                      {method === opt.key && <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />}
                    </button>
                  ))}
                </div>

                <button onClick={() => setStep('verify')}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
                  Continue
                </button>
              </motion.div>
            )}

            {/* Step: Verify OTP */}
            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-white font-bold text-lg mb-2">Enter Verification Code</h2>
                <p className="text-blue-200/70 text-sm mb-6">
                  Enter the 6-digit code sent to your {method}
                  <br/>
                  <span className="text-blue-300 text-xs">(Demo: enter any 6 digits)</span>
                </p>

                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((digit, i) => (
                    <input key={i} id={`otp-${i}`} type="text" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      className="w-11 h-13 text-center text-white font-bold text-lg rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                  ))}
                </div>

                <button onClick={handleVerifyOtp} disabled={isLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
                </button>
              </motion.div>
            )}

            {/* Step: New password */}
            {step === 'input' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-white font-bold text-lg mb-2">Create New Password</h2>
                <p className="text-blue-200/70 text-sm mb-6">Choose a strong, secure password</p>

                <div className="space-y-4 mb-6">
                  {[
                    { label: 'New Password', value: newPassword, setter: setNewPassword, placeholder: 'Min. 8 characters' },
                    { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Repeat your password' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-semibold text-blue-200 mb-1.5 uppercase tracking-wider">{f.label}</label>
                      <input type="password" value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                        className="w-full px-4 py-3 rounded-xl text-white placeholder:text-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} />
                    </div>
                  ))}
                </div>

                <button onClick={handleResetPassword} disabled={isLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
                  {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
                </button>
              </motion.div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-white font-bold text-lg mb-2">Password Reset!</h2>
                <p className="text-blue-200/70 text-sm mb-6">Your password has been updated successfully.</p>
                <Link href="/login" className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  Back to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 text-center">
          <Link href="/login" className="text-blue-300/60 text-xs hover:text-blue-200 flex items-center justify-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
