'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Download, Upload, RefreshCw, CheckCircle, Clock,
  Shield, AlertTriangle, HardDrive, Calendar, Trash2, Play, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatDate, formatFileSize } from '@/lib/utils'

const BACKUP_HISTORY = [
  { id: 'b1', name: 'Full System Backup', date: '2026-05-18T03:00:00Z', size: 245 * 1024 * 1024, type: 'automatic', status: 'success', duration: '4m 12s' },
  { id: 'b2', name: 'Full System Backup', date: '2026-05-17T03:00:00Z', size: 242 * 1024 * 1024, type: 'automatic', status: 'success', duration: '4m 08s' },
  { id: 'b3', name: 'Manual Backup — Before Update', date: '2026-05-15T14:30:00Z', size: 238 * 1024 * 1024, type: 'manual', status: 'success', duration: '3m 55s' },
  { id: 'b4', name: 'Full System Backup', date: '2026-05-15T03:00:00Z', size: 237 * 1024 * 1024, type: 'automatic', status: 'success', duration: '4m 01s' },
  { id: 'b5', name: 'Full System Backup', date: '2026-05-14T03:00:00Z', size: 234 * 1024 * 1024, type: 'automatic', status: 'failed', duration: '1m 22s' },
  { id: 'b6', name: 'Weekly Archive Backup', date: '2026-05-11T02:00:00Z', size: 890 * 1024 * 1024, type: 'weekly', status: 'success', duration: '14m 33s' },
  { id: 'b7', name: 'Full System Backup', date: '2026-05-10T03:00:00Z', size: 228 * 1024 * 1024, type: 'automatic', status: 'success', duration: '3m 48s' },
]

const BACKUP_SETTINGS = [
  { label: 'Daily Automatic Backup', description: 'Runs every day at 3:00 AM', enabled: true },
  { label: 'Weekly Full Archive', description: 'Every Sunday at 2:00 AM', enabled: true },
  { label: 'Monthly Cold Backup', description: 'First day of each month', enabled: false },
  { label: 'Backup Before System Updates', description: 'Triggered automatically before updates', enabled: true },
  { label: 'Email Notification on Failure', description: 'Alert admin when backup fails', enabled: true },
]

export default function BackupPage() {
  const [backups, setBackups] = useState(BACKUP_HISTORY)
  const [running, setRunning] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [settings, setSettings] = useState(BACKUP_SETTINGS)

  const handleRunBackup = async () => {
    setRunning(true)
    await new Promise(r => setTimeout(r, 3000))
    const newBackup = {
      id: `b${Date.now()}`,
      name: 'Manual Backup — Admin Initiated',
      date: new Date().toISOString(),
      size: 246 * 1024 * 1024,
      type: 'manual',
      status: 'success',
      duration: '4m 05s',
    }
    setBackups(b => [newBackup, ...b])
    setRunning(false)
    toast.success('Backup completed successfully!')
  }

  const handleRestore = async (id: string, name: string) => {
    setRestoring(id)
    await new Promise(r => setTimeout(r, 2500))
    setRestoring(null)
    toast.success(`Restore from "${name}" completed!`)
  }

  const handleDelete = (id: string) => {
    setBackups(b => b.filter(bk => bk.id !== id))
    toast.success('Backup deleted')
  }

  const toggleSetting = (index: number) => {
    setSettings(s => s.map((item, i) => i === index ? { ...item, enabled: !item.enabled } : item))
  }

  const successCount = backups.filter(b => b.status === 'success').length
  const totalSize = backups.filter(b => b.status === 'success').reduce((a, b) => a + b.size, 0)
  const lastBackup = backups[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Backup Management
          </h1>
          <p className="page-subtitle">System data backup, restore, and disaster recovery management</p>
        </div>
        <motion.button
          onClick={handleRunBackup}
          disabled={running}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Creating Backup...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Backup Now
            </>
          )}
        </motion.button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Last Backup',
            value: lastBackup?.date ? new Date(lastBackup.date).toLocaleDateString('en-SA', { month: 'short', day: 'numeric' }) : 'Never',
            icon: Clock,
            color: 'blue',
            sub: lastBackup?.status === 'success' ? 'Successful' : 'Failed',
          },
          {
            label: 'Total Backups',
            value: successCount,
            icon: CheckCircle,
            color: 'green',
            sub: `${backups.length} total`,
          },
          {
            label: 'Storage Used',
            value: formatFileSize(totalSize),
            icon: HardDrive,
            color: 'purple',
            sub: 'Backup storage',
          },
          {
            label: 'Retention Period',
            value: '30 days',
            icon: Calendar,
            color: 'orange',
            sub: 'Auto-cleanup',
          },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn('premium-card p-4 flex items-center gap-3',
              s.color === 'blue' && 'border-l-4 border-l-blue-500',
              s.color === 'green' && 'border-l-4 border-l-green-500',
              s.color === 'purple' && 'border-l-4 border-l-purple-500',
              s.color === 'orange' && 'border-l-4 border-l-orange-500',
            )}>
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'purple' && 'bg-purple-100',
              s.color === 'orange' && 'bg-orange-100',
            )}>
              <s.icon className={cn('w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'purple' && 'text-purple-600',
                s.color === 'orange' && 'text-orange-600',
              )} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Running backup indicator */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="premium-card p-5 border-l-4 border-l-blue-500 bg-blue-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-900">Backup in Progress</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Creating full system backup — database, files, research records, user data...
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Backup history */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Backup History</h2>
            <button className="btn-secondary text-sm">
              <Download className="w-4 h-4" />
              Export Log
            </button>
          </div>
          <div className="premium-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Backup Name</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((bk, i) => (
                  <motion.tr key={bk.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{bk.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge text-xs capitalize',
                        bk.type === 'automatic' && 'bg-blue-100 text-blue-700 border-blue-200',
                        bk.type === 'manual' && 'bg-purple-100 text-purple-700 border-purple-200',
                        bk.type === 'weekly' && 'bg-green-100 text-green-700 border-green-200',
                      )}>
                        {bk.type}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600">{formatDate(bk.date)}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-500">{formatFileSize(bk.size)}</span>
                    </td>
                    <td>
                      <span className={cn('badge text-xs',
                        bk.status === 'success' && 'bg-green-100 text-green-700 border-green-200',
                        bk.status === 'failed' && 'bg-red-100 text-red-700 border-red-200',
                      )}>
                        {bk.status === 'success' ? (
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Success</span>
                        ) : (
                          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Failed</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-500">{bk.duration}</span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {bk.status === 'success' && (
                          <button
                            onClick={() => handleRestore(bk.id, bk.name)}
                            disabled={restoring === bk.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all disabled:opacity-50"
                            title="Restore from this backup">
                            {restoring === bk.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Upload className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => toast.success(`Downloading backup: ${bk.name}`)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(bk.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backup settings */}
        <div className="space-y-4">
          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Backup Schedule
            </h2>
            <div className="space-y-3">
              {settings.map((s, i) => (
                <label key={s.label} className="flex items-start justify-between gap-3 cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.description}</p>
                  </div>
                  <button
                    onClick={() => toggleSetting(i)}
                    className={cn('w-10 h-5.5 rounded-full transition-all relative flex-shrink-0 mt-0.5',
                      s.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                    style={{ height: '22px', width: '40px' }}
                  >
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                      s.enabled ? 'left-5' : 'left-0.5'
                    )} />
                  </button>
                </label>
              ))}
            </div>
            <button
              onClick={() => toast.success('Backup settings saved!')}
              className="btn-primary w-full mt-5 text-sm">
              Save Settings
            </button>
          </div>

          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-3">Storage Overview</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Backup Storage</span>
                  <span className="font-semibold text-gray-900">{formatFileSize(totalSize)}</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((totalSize / (10 * 1024 * 1024 * 1024)) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">of 10 GB allocated</p>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {[
                  { label: 'Daily Backups', count: backups.filter(b => b.type === 'automatic').length, color: 'blue' },
                  { label: 'Manual Backups', count: backups.filter(b => b.type === 'manual').length, color: 'purple' },
                  { label: 'Weekly Archives', count: backups.filter(b => b.type === 'weekly').length, color: 'green' },
                  { label: 'Failed', count: backups.filter(b => b.status === 'failed').length, color: 'red' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={cn('font-bold',
                      item.color === 'blue' && 'text-blue-600',
                      item.color === 'purple' && 'text-purple-600',
                      item.color === 'green' && 'text-green-600',
                      item.color === 'red' && 'text-red-600',
                    )}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="premium-card p-5 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Data Protection</p>
                <p className="text-xs text-blue-700 mt-1">
                  All backups are encrypted with AES-256. Data is retained for 30 days before automatic removal.
                  Critical backups are replicated to a secondary location.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
