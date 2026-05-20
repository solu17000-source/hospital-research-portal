'use client'
import { motion } from 'framer-motion'
import {
  FlaskConical, CheckCircle, BookOpen, Clock, AlertTriangle,
  Shield, TrendingUp, Building2, Users, DollarSign, Activity,
  Calendar, BarChart2, Star, Globe, Plus, ChevronRight, Eye
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  DEMO_STATS, DEMO_RESEARCH, DEMO_AI_INSIGHTS,
  MONTHLY_RESEARCH_DATA, DEPT_PERFORMANCE_DATA
} from '@/lib/demo-data'
import { cn, formatDate, formatCurrency, getStatusBadgeClass, timeAgo } from '@/lib/utils'
import { WORKFLOW_STAGES, STATUS_COLORS } from '@/types'

const QUARTILE_DATA = [
  { name: 'Q1', value: DEMO_STATS.q1_publications, color: '#7c3aed' },
  { name: 'Q2', value: DEMO_STATS.q2_publications, color: '#2563eb' },
  { name: 'Q3', value: DEMO_STATS.q3_publications, color: '#0891b2' },
  { name: 'Q4', value: DEMO_STATS.q4_publications, color: '#6b7280' },
]

const STATUS_PIE_DATA = [
  { name: 'Active', value: 74, color: '#22c55e' },
  { name: 'Completed', value: 27, color: '#3b82f6' },
  { name: 'Delayed', value: 8, color: '#f97316' },
  { name: 'On Hold', value: 5, color: '#6b7280' },
  { name: 'Pending', value: 4, color: '#f59e0b' },
]

export default function DashboardPage() {
  const stats = DEMO_STATS
  const recentResearch = DEMO_RESEARCH.slice(0, 5)
  const insights = DEMO_AI_INSIGHTS.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/hospital-logo.png"
            alt="PMNH"
            className="w-14 h-14 object-contain flex-shrink-0 hidden sm:block"
            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Research Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Health & Nursing Research Unit · Prince Mohammed Bin Nasser Hospital</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/research/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Research
          </Link>
          <Link href="/reports" className="btn-secondary text-sm">
            <BarChart2 className="w-4 h-4" />
            Reports
          </Link>
        </div>
      </motion.div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Projects" value={stats.total_projects} icon={FlaskConical}
          gradient="linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"
          change={8} changeLabel="vs last quarter" index={0} />
        <StatCard title="Active Research" value={stats.active_projects} icon={Activity}
          gradient="linear-gradient(135deg, #15803d 0%, #22c55e 100%)"
          change={12} changeLabel="currently running" index={1} />
        <StatCard title="Published Papers" value={stats.published_papers} icon={BookOpen}
          gradient="linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)"
          change={5} changeLabel="indexed journals" index={2} />
        <StatCard title="Delayed Projects" value={stats.delayed_projects} icon={AlertTriangle}
          gradient="linear-gradient(135deg, #c2410c 0%, #f97316 100%)"
          change={-3} changeLabel="needs attention" index={3} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending IRB" value={stats.pending_irb} icon={Shield}
          gradient="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" index={4} />
        <StatCard title="Completed" value={stats.completed_projects} icon={CheckCircle}
          gradient="linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)" index={5} />
        <StatCard title="New This Month" value={stats.this_month_new} icon={TrendingUp}
          gradient="linear-gradient(135deg, #9d174d 0%, #ec4899 100%)" index={6} />
        <StatCard title="Total Budget" value="4.85M" icon={DollarSign} prefix="SAR "
          gradient="linear-gradient(135deg, #3730a3 0%, #6366f1 100%)" index={7} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Growth */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Research Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Monthly new, completed & published projects</p>
            </div>
            <span className="badge bg-blue-100 text-blue-700 border-blue-200">2025</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_RESEARCH_DATA}>
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="new" stroke="#2563eb" fill="url(#colorNew)" strokeWidth={2} name="New" />
              <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#colorCompleted)" strokeWidth={2} name="Completed" />
              <Area type="monotone" dataKey="published" stroke="#7c3aed" fill="url(#colorPublished)" strokeWidth={2} name="Published" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="premium-card p-5">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Project Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Current distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={STATUS_PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                paddingAngle={3} dataKey="value">
                {STATUS_PIE_DATA.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {STATUS_PIE_DATA.map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-600 text-xs">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-800 text-xs">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Performance & Quartile Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Department Bar Chart */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Department Performance</h2>
              <p className="text-xs text-gray-500 mt-0.5">Projects vs publications by department</p>
            </div>
            <Link href="/departments" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEPT_PERFORMANCE_DATA} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="projects" fill="#3b82f6" name="Projects" radius={[4, 4, 0, 0]} />
              <Bar dataKey="published" fill="#22c55e" name="Published" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Journal Quartile & Publication Stats */}
        <div className="space-y-4">
          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Journal Quartiles</h2>
            <div className="space-y-3">
              {QUARTILE_DATA.map(q => (
                <div key={q.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: q.color }}>
                        {q.name}
                      </div>
                      <span className="text-gray-600 font-medium">Journal {q.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{q.value}</span>
                  </div>
                  <div className="progress-bar">
                    <motion.div className="progress-fill" style={{ background: q.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(q.value / stats.published_papers) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">Open Access</span>
              <span className="font-bold text-emerald-600">{stats.open_access_count} papers</span>
            </div>
          </div>

          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Quick Stats</h2>
            <div className="space-y-2">
              {[
                { label: 'Departments', value: stats.total_departments, icon: Building2, color: 'text-blue-600' },
                { label: 'Researchers', value: stats.total_users, icon: Users, color: 'text-purple-600' },
                { label: 'Funded Projects', value: stats.funded_projects, icon: DollarSign, color: 'text-green-600' },
                { label: 'Due This Week', value: stats.upcoming_deadlines, icon: Calendar, color: 'text-orange-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn('w-4 h-4', item.color)} />
                    <span className="text-gray-600 text-sm">{item.label}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">AI Smart Insights</h2>
              <p className="text-xs text-gray-500">Automated analysis & recommendations</p>
            </div>
          </div>
          <Link href="/ai-insights" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            All insights <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <motion.div key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'rounded-xl p-4 border',
                insight.type === 'warning' && 'bg-orange-50 border-orange-200',
                insight.type === 'recommendation' && 'bg-blue-50 border-blue-200',
                insight.type === 'success' && 'bg-green-50 border-green-200',
                insight.type === 'info' && 'bg-purple-50 border-purple-200',
              )}>
              <div className="flex items-start gap-2.5">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  insight.type === 'warning' && 'bg-orange-100',
                  insight.type === 'recommendation' && 'bg-blue-100',
                  insight.type === 'success' && 'bg-green-100',
                  insight.type === 'info' && 'bg-purple-100',
                )}>
                  <Activity className={cn('w-3.5 h-3.5',
                    insight.type === 'warning' && 'text-orange-600',
                    insight.type === 'recommendation' && 'text-blue-600',
                    insight.type === 'success' && 'text-green-600',
                    insight.type === 'info' && 'text-purple-600',
                  )} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{insight.title}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-3">{insight.message}</p>
                  {insight.score && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${insight.score}%`,
                          background: insight.type === 'warning' ? '#f97316' : insight.type === 'success' ? '#22c55e' : '#3b82f6'
                        }} />
                      </div>
                      <span className="text-xs text-gray-500">{insight.score}%</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Research */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Research Projects</h2>
          <Link href="/research" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Research ID</th>
                <th>Title</th>
                <th>Department</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentResearch.map(r => {
                const stage = WORKFLOW_STAGES[r.workflow_stage]
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-blue-600">{r.research_id}</span>
                    </td>
                    <td>
                      <p className="font-medium text-gray-900 max-w-xs truncate text-xs">{r.title}</p>
                    </td>
                    <td>
                      <span className="text-xs text-gray-500">{r.department_id ? ['ICU','Nursing','Surgery','Pediatrics','Cardiology','Internal Med','Radiology'][['d5','d6','d2','d3','d7','d1','d9'].indexOf(r.department_id)] || r.department_id : 'N/A'}</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: stage.color + '20', color: stage.color }}>
                        {stage.label}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge text-xs', getStatusBadgeClass(r.status))}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge text-xs capitalize', getStatusBadgeClass(r.priority_level))}>
                        {r.priority_level}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.completion_percentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{r.completion_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-gray-400">{timeAgo(r.updated_at)}</span>
                    </td>
                    <td>
                      <Link href={`/research/${r.id}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
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
