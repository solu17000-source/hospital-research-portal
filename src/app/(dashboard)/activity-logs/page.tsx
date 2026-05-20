'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Filter, Download, LogIn, Edit, Trash2, Upload, Download as DL, QrCode, Shield, Eye } from 'lucide-react'
import { DEMO_ACTIVITY_LOGS } from '@/lib/demo-data'
import { cn, formatDate, timeAgo } from '@/lib/utils'

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogIn,
  create: Edit,
  update: Edit,
  delete: Trash2,
  upload: Upload,
  download: DL,
  qr_scan: QrCode,
  permission_change: Shield,
  password_change: Shield,
  view: Eye,
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-600',
  logout: 'bg-gray-100 text-gray-500',
  create: 'bg-blue-100 text-blue-600',
  update: 'bg-cyan-100 text-cyan-600',
  delete: 'bg-red-100 text-red-600',
  upload: 'bg-purple-100 text-purple-600',
  download: 'bg-indigo-100 text-indigo-600',
  qr_scan: 'bg-yellow-100 text-yellow-600',
  permission_change: 'bg-orange-100 text-orange-600',
  password_change: 'bg-rose-100 text-rose-600',
  view: 'bg-gray-100 text-gray-500',
}

const EXTRA_LOGS = [
  { id: 'a7', user_name: 'Dr. Fatima Al-Zahrani', action: 'create', entity_type: 'report', entity_name: 'Annual Analytics 2026', description: 'Generated annual research report', created_at: '2026-05-13T09:30:00Z' },
  { id: 'a8', user_name: 'Afnan Bakri', action: 'upload', entity_type: 'attachment', entity_name: 'Data-Collection-Sheet.xlsx', description: 'Uploaded data collection form', created_at: '2026-05-12T14:10:00Z' },
  { id: 'a9', user_name: 'Dr. Khalid Al-Ghamdi', action: 'login', entity_type: 'auth', description: 'Logged in from mobile device', ip_address: '10.0.0.45', created_at: '2026-05-12T08:05:00Z' },
  { id: 'a10', user_name: 'Sultan Alallah', action: 'update', entity_type: 'research_project', entity_name: 'AI-Assisted Radiology Diagnosis', description: 'Updated IRB approval status', created_at: '2026-05-11T11:00:00Z' },
  { id: 'a11', user_name: 'Afnan Bakri', action: 'download', entity_type: 'report', entity_name: 'Department Productivity Q1 2026', description: 'Downloaded productivity report', created_at: '2026-05-10T16:20:00Z' },
  { id: 'a12', user_name: 'Sultan Alallah', action: 'permission_change', entity_type: 'user', entity_name: 'dr.khalid.surgery', description: 'Updated user role to Department Head', created_at: '2026-05-09T10:00:00Z' },
]

const ALL_LOGS = [...DEMO_ACTIVITY_LOGS, ...EXTRA_LOGS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = ALL_LOGS.filter(log => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      log.user_name?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.entity_name?.toLowerCase().includes(q)
    const matchAction = actionFilter === 'all' || log.action === actionFilter
    return matchSearch && matchAction
  })

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-blue-600" />
            Activity Logs
          </h1>
          <p className="page-subtitle">Complete audit trail of all system actions and user activities</p>
        </div>
        <button className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Actions", value: 6, color: 'blue' },
          { label: 'Logins Today', value: 3, color: 'green' },
          { label: 'File Uploads', value: 2, color: 'purple' },
          { label: 'QR Scans', value: 1, color: 'orange' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn('premium-card p-4 text-center',
              s.color === 'blue' && 'border-t-4 border-t-blue-500',
              s.color === 'green' && 'border-t-4 border-t-green-500',
              s.color === 'purple' && 'border-t-4 border-t-purple-500',
              s.color === 'orange' && 'border-t-4 border-t-orange-500',
            )}>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by user, action, or entity..."
            className="form-input pl-9" />
        </div>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="form-input w-auto">
          <option value="all">All Actions</option>
          <option value="login">Login</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="upload">Upload</option>
          <option value="download">Download</option>
          <option value="qr_scan">QR Scan</option>
          <option value="permission_change">Permission Change</option>
        </select>
      </div>

      {/* Logs table */}
      <div className="premium-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Description</th>
              <th>Entity</th>
              <th>IP Address</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No logs found</td></tr>
            ) : (
              paginated.map(log => {
                const Icon = ACTION_ICONS[log.action] || Edit
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-500')}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 capitalize">{log.action.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-800">{log.user_name || 'System'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600">{log.description || '—'}</span>
                    </td>
                    <td>
                      <div>
                        {log.entity_name && <p className="text-xs font-medium text-gray-800 truncate max-w-[150px]">{log.entity_name}</p>}
                        {log.entity_type && <p className="text-xs text-gray-400 capitalize">{log.entity_type.replace('_', ' ')}</p>}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-gray-500 font-mono">{log.ip_address || '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
