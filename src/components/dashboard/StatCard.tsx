'use client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  gradient: string
  change?: number
  changeLabel?: string
  suffix?: string
  prefix?: string
  index?: number
  onClick?: () => void
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

export function StatCard({ title, value, icon: Icon, gradient, change, changeLabel, suffix = '', prefix = '', index = 0, onClick }: StatCardProps) {
  const numValue = typeof value === 'number' ? value : parseInt(value as string) || 0
  const animatedValue = useCountUp(numValue)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      onClick={onClick}
      className={cn('rounded-2xl p-5 text-white relative overflow-hidden shadow-lg', onClick && 'cursor-pointer hover:scale-[1.02] transition-transform')}
      style={{ background: gradient }}
    >
      {/* Background pattern */}
      <div className="absolute right-0 top-0 w-32 h-32 opacity-10">
        <div className="w-full h-full rounded-full border-[20px] border-white translate-x-8 -translate-y-8" />
      </div>
      <div className="absolute right-4 bottom-0 w-16 h-16 opacity-5">
        <div className="w-full h-full rounded-full border-[12px] border-white translate-y-6" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold', change >= 0 ? 'bg-white/20' : 'bg-white/10')}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white leading-none">
            {prefix}{typeof value === 'string' && isNaN(numValue) ? value : animatedValue.toLocaleString()}{suffix}
          </p>
          {changeLabel && (
            <p className="text-white/60 text-xs">{changeLabel}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
