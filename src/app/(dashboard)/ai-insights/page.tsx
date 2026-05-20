'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, AlertTriangle, Lightbulb, CheckCircle, Info, TrendingUp, TrendingDown, Star, RefreshCw, ChevronRight, Clock } from 'lucide-react'
import { DEMO_AI_INSIGHTS, DEMO_RESEARCH, DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { cn, timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import Link from 'next/link'

const DEPT_RADAR_DATA = [
  { dept: 'Nursing', publications: 85, timeliness: 70, collaboration: 90, quality: 88, funding: 75 },
  { dept: 'Cardiology', publications: 95, timeliness: 88, collaboration: 82, quality: 91, funding: 90 },
  { dept: 'Surgery', publications: 72, timeliness: 78, collaboration: 65, quality: 79, funding: 85 },
]

const STAFF_PRODUCTIVITY = [
  { name: 'Sultan Alallah', score: 94, projects: 12, published: 5, on_time: 92 },
  { name: 'Dr. Fatima Al-Zahrani', score: 89, projects: 8, published: 3, on_time: 88 },
  { name: 'Afnan Bakri', score: 85, projects: 14, published: 2, on_time: 75 },
  { name: 'Dr. Khalid Al-Ghamdi', score: 81, projects: 6, published: 2, on_time: 84 },
]

const INSIGHT_ICONS = {
  warning: AlertTriangle,
  recommendation: Lightbulb,
  success: CheckCircle,
  info: Info,
}

const INSIGHT_STYLES = {
  warning: 'bg-orange-50 border-orange-200 text-orange-700',
  recommendation: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info: 'bg-purple-50 border-purple-200 text-purple-700',
}

const ICON_STYLES = {
  warning: 'bg-orange-100 text-orange-600',
  recommendation: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  info: 'bg-purple-100 text-purple-600',
}

export default function AIInsightsPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const filtered = DEMO_AI_INSIGHTS.filter(i => filter === 'all' || i.type === filter)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 1500))
    setRefreshing(false)
    toast.success('AI insights refreshed with latest data!')
  }

  const delayedProjects = DEMO_RESEARCH.filter(r => r.status === 'delayed')
  const pendingIRB = DEMO_RESEARCH.filter(r => r.irb_approval_status === 'pending')
  const nearingDeadline = DEMO_RESEARCH.filter(r => {
    if (!r.expected_completion_date) return false
    const days = Math.ceil((new Date(r.expected_completion_date).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 30
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Smart Insights
          </h1>
          <p className="page-subtitle">Automated analysis, predictions, and recommendations powered by research data analytics</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="btn-secondary text-sm disabled:opacity-70">
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Delayed Projects', value: delayedProjects.length, color: 'orange', icon: AlertTriangle, trend: 'down' },
          { label: 'Pending IRB', value: pendingIRB.length, color: 'yellow', icon: Clock, trend: 'up' },
          { label: 'Nearing Deadline', value: nearingDeadline.length, color: 'red', icon: TrendingDown, trend: 'down' },
          { label: 'Active Insights', value: DEMO_AI_INSIGHTS.length, color: 'purple', icon: Brain, trend: 'stable' },
        ].map((m, i) => (
          <motion.div key={m.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn('premium-card p-4 flex items-center gap-3',
              m.color === 'orange' && 'border-l-4 border-l-orange-500',
              m.color === 'yellow' && 'border-l-4 border-l-yellow-500',
              m.color === 'red' && 'border-l-4 border-l-red-500',
              m.color === 'purple' && 'border-l-4 border-l-purple-500',
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              m.color === 'orange' && 'bg-orange-100',
              m.color === 'yellow' && 'bg-yellow-100',
              m.color === 'red' && 'bg-red-100',
              m.color === 'purple' && 'bg-purple-100',
            )}>
              <m.icon className={cn('w-5 h-5',
                m.color === 'orange' && 'text-orange-600',
                m.color === 'yellow' && 'text-yellow-600',
                m.color === 'red' && 'text-red-600',
                m.color === 'purple' && 'text-purple-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insights Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-gray-900">Intelligence Alerts</h2>
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {['all', 'warning', 'recommendation', 'success', 'info'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((insight, i) => {
            const Icon = INSIGHT_ICONS[insight.type]
            return (
              <motion.div key={insight.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={cn('rounded-2xl p-5 border', INSIGHT_STYLES[insight.type])}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', ICON_STYLES[insight.type])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">{insight.title}</h3>
                      {insight.score && (
                        <span className="flex items-center gap-1 text-xs font-bold opacity-80 flex-shrink-0">
                          <Star className="w-3 h-3" />
                          {insight.score}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1.5 opacity-85">{insight.message}</p>
                    {insight.score && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full bg-current opacity-60"
                            initial={{ width: 0 }}
                            animate={{ width: `${insight.score}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }} />
                        </div>
                        <span className="text-xs opacity-60">Confidence {insight.score}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs opacity-60">{timeAgo(insight.created_at)}</span>
                      {insight.action && (
                        <button className="text-xs font-semibold flex items-center gap-1 hover:underline">
                          {insight.action} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Staff Productivity Scores */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Staff Productivity Analytics</h2>
        <div className="space-y-3">
          {STAFF_PRODUCTIVITY.map((staff, i) => (
            <div key={staff.name} className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                {staff.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-900">{staff.name}</span>
                  <span className="font-bold text-sm text-blue-600">{staff.score}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: staff.score >= 90 ? '#22c55e' : staff.score >= 80 ? '#3b82f6' : '#f97316' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${staff.score}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }} />
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 flex-shrink-0">
                    <span>{staff.projects} projects</span>
                    <span>{staff.published} published</span>
                    <span>{staff.on_time}% on-time</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delayed projects list */}
      {delayedProjects.length > 0 && (
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Delayed Research Projects
            </h2>
            <Link href="/research?status=delayed" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {delayedProjects.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.research_id} · Expected: {r.expected_completion_date?.slice(0,7)}</p>
                </div>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                  {r.completion_percentage}% done
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
