'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, User, AlertCircle, Shield, ChevronRight, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [particles, setParticles] = useState<Array<{id:number;x:number;y:number;size:number;opacity:number}>>([])

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      }))
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }
    const result = await login(username.trim(), password)
    if (result.success) {
      toast.success('Welcome back! Redirecting to dashboard...')
      router.push('/dashboard')
    } else {
      setError(result.error || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2460 30%, #1e3a8a 60%, #1d4ed8 100%)' }}>

      {/* Animated background particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-300"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [-10, 10, -10], opacity: [p.opacity, p.opacity * 2, p.opacity] }}
          transition={{ duration: 4 + p.id * 0.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-4 shadow-xl"
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}
          >
            <img
              src="/hospital-logo.png"
              alt="Prince Mohammed Bin Nasser Hospital"
              className="w-20 h-20 object-contain"
              onError={(e) => {
                const t = e.currentTarget
                t.onerror = null
                t.src = '/hospital-logo.svg'
              }}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <h1 className="text-xl font-bold text-white leading-tight">
              Health & Nursing Research Unit
            </h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">
              Prince Mohammed Bin Nasser Hospital
            </p>
            <p className="text-blue-300/70 text-xs mt-0.5">
              Jazan, Kingdom of Saudi Arabia
            </p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-white font-bold text-xl">Secure Portal Access</h2>
            <p className="text-blue-200/70 text-sm mt-1">Authorized personnel only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-2 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/70" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder:text-blue-300/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-white placeholder:text-blue-300/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/70 hover:text-blue-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-red-300 text-xs">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demo credentials hint */}
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-blue-200/80">
                <span className="font-semibold text-blue-300">Demo Mode:</span> Use{' '}
                <code className="bg-blue-900/50 px-1 rounded text-blue-200">research-unit PMNH</code> /{' '}
                <code className="bg-blue-900/50 px-1 rounded text-blue-200">PMNH@Research2024!</code>
              </div>
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Research Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer links */}
          <div className="mt-5 flex items-center justify-between text-xs">
            <a href="/forgot-password" className="text-blue-300/70 hover:text-blue-200 transition-colors">
              Forgot password?
            </a>
            <a href="/visitor" className="text-blue-300/70 hover:text-blue-200 transition-colors flex items-center gap-1">
              Public Portal
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-blue-300/40 text-xs mt-6"
        >
          © 2026 PMNH Research Portal · Jazan, Saudi Arabia · Confidential System
        </motion.p>
      </motion.div>
    </div>
  )
}
