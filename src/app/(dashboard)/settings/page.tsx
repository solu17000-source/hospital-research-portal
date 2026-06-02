'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, User, Shield, Bell, Database, Globe, Save,
  Eye, EyeOff, Camera, CheckCircle, Building2, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/types'
import { useDepartments } from '@/lib/data-source'
import type { Department } from '@/types'

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System Settings', icon: Settings },
  { id: 'hospital', label: 'Hospital Info', icon: Building2 },
]

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { data: deptData } = useDepartments()
  const departments: Department[] = deptData ?? []
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  // Profile form
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || '',
    department_id: user?.department_id || '',
  })

  // Security form
  const [security, setSecurity] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    new_username: '',
  })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    email_delays: true,
    email_deadlines: true,
    email_approvals: true,
    email_publications: true,
    email_qr: false,
    sms_critical: false,
    sms_deadlines: false,
    inapp_all: true,
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    updateProfile({ full_name: profile.full_name, phone: profile.phone })
    setSaving(false)
    toast.success('Profile updated successfully!')
  }

  const handleChangePassword = async () => {
    if (!security.current_password) { toast.error('Enter current password'); return }
    if (security.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (security.new_password !== security.confirm_password) { toast.error('Passwords do not match'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    setSecurity({ current_password: '', new_password: '', confirm_password: '', new_username: '' })
    toast.success('Password changed successfully!')
  }

  const handleChangeUsername = async () => {
    if (!security.new_username.trim()) { toast.error('Enter new username'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    updateProfile({ username: security.new_username })
    setSaving(false)
    toast.success('Username updated successfully!')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Settings
        </h1>
        <p className="page-subtitle">Manage your account, security, and system preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="md:w-56 flex-shrink-0">
          <div className="premium-card p-2">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                )}>
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="premium-card p-6 space-y-5">
                  <h2 className="font-bold text-gray-900 text-lg">My Profile</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl text-white"
                        style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                        {getInitials(user?.full_name || '')}
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{user?.full_name}</p>
                      <p className="text-sm text-gray-500">{ROLE_LABELS[user?.role || 'viewer']}</p>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block font-mono">{user?.username}</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Full Name</label>
                      <input value={profile.full_name} onChange={e => setProfile(f => ({ ...f, full_name: e.target.value }))}
                        className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Email Address</label>
                      <input type="email" value={profile.email} readOnly
                        className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input value={profile.phone} onChange={e => setProfile(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+966 5X XXX XXXX" className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <select value={profile.department_id} onChange={e => setProfile(f => ({ ...f, department_id: e.target.value }))}
                        className="form-input">
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Role</label>
                      <input value={ROLE_LABELS[user?.role || 'viewer']} readOnly
                        className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                  </button>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  {/* Change username */}
                  <div className="premium-card p-6 space-y-4">
                    <h2 className="font-bold text-gray-900">Change Username</h2>
                    <p className="text-sm text-gray-500">Current username: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-blue-600">{user?.username}</code></p>
                    <div>
                      <label className="form-label">New Username</label>
                      <input value={security.new_username} onChange={e => setSecurity(s => ({ ...s, new_username: e.target.value }))}
                        placeholder="Enter new username" className="form-input" />
                    </div>
                    <button onClick={handleChangeUsername} className="btn-primary text-sm">
                      <Save className="w-4 h-4" />
                      Update Username
                    </button>
                  </div>

                  {/* Change password */}
                  <div className="premium-card p-6 space-y-4">
                    <h2 className="font-bold text-gray-900">Change Password</h2>
                    {(['current', 'new', 'confirm'] as const).map(field => (
                      <div key={field}>
                        <label className="form-label capitalize">{field} Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords[field] ? 'text' : 'password'}
                            value={(security as Record<string, string>)[field + '_password']}
                            onChange={e => setSecurity(s => ({ ...s, [`${field}_password`]: e.target.value }))}
                            placeholder={`Enter ${field} password`}
                            className="form-input pr-10" />
                          <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [field]: !p[field] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                      Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.
                    </div>
                    <button onClick={handleChangePassword} disabled={saving} className="btn-primary text-sm">
                      <Shield className="w-4 h-4" />
                      Change Password
                    </button>
                  </div>

                  {/* Active sessions */}
                  <div className="premium-card p-6">
                    <h2 className="font-bold text-gray-900 mb-4">Active Sessions</h2>
                    <div className="space-y-3">
                      {[
                        { device: 'Chrome · Windows 11', ip: '192.168.1.100', time: '2 minutes ago', current: true },
                        { device: 'Safari · iPhone 14', ip: '10.0.0.45', time: '3 hours ago', current: false },
                      ].map((session, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {session.device}
                              {session.current && <span className="ml-2 badge bg-green-100 text-green-700 border-green-200 text-xs">Current</span>}
                            </p>
                            <p className="text-xs text-gray-500">{session.ip} · {session.time}</p>
                          </div>
                          {!session.current && (
                            <button className="text-xs text-red-500 hover:text-red-700 font-medium">Revoke</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="premium-card p-6 space-y-5">
                  <h2 className="font-bold text-gray-900 text-lg">Notification Preferences</h2>
                  {[
                    { key: 'email', label: 'Email Notifications', items: [
                      { key: 'email_delays', label: 'Delayed projects alert' },
                      { key: 'email_deadlines', label: 'Upcoming deadline warning' },
                      { key: 'email_approvals', label: 'IRB/Ethics approval updates' },
                      { key: 'email_publications', label: 'Publication confirmations' },
                      { key: 'email_qr', label: 'New QR code submissions' },
                    ]},
                    { key: 'sms', label: 'SMS Notifications', items: [
                      { key: 'sms_critical', label: 'Critical alerts only' },
                      { key: 'sms_deadlines', label: 'Deadline reminders' },
                    ]},
                    { key: 'inapp', label: 'In-App Notifications', items: [
                      { key: 'inapp_all', label: 'All in-app notifications' },
                    ]},
                  ].map(section => (
                    <div key={section.key}>
                      <p className="font-semibold text-gray-700 text-sm mb-3">{section.label}</p>
                      <div className="space-y-2">
                        {section.items.map(item => (
                          <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <button
                              onClick={() => setNotifSettings(n => ({ ...n, [item.key]: !(n as Record<string,boolean>)[item.key] }))}
                              className={cn('w-11 h-6 rounded-full transition-all relative flex-shrink-0',
                                (notifSettings as Record<string,boolean>)[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                              )}>
                              <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                                (notifSettings as Record<string,boolean>)[item.key] ? 'left-6' : 'left-1'
                              )} />
                            </button>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => toast.success('Notification settings saved!')} className="btn-primary text-sm">
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              )}

              {/* System Settings */}
              {activeTab === 'system' && (
                <div className="premium-card p-6 space-y-5">
                  <h2 className="font-bold text-gray-900 text-lg">System Settings</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { label: 'Session Timeout (minutes)', value: '60', type: 'number' },
                      { label: 'Max Login Attempts', value: '5', type: 'number' },
                      { label: 'Lockout Duration (minutes)', value: '30', type: 'number' },
                      { label: 'Deadline Warning (days)', value: '7', type: 'number' },
                    ].map(s => (
                      <div key={s.label}>
                        <label className="form-label">{s.label}</label>
                        <input type={s.type} defaultValue={s.value} className="form-input" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Enable Email Notifications', key: 'email' },
                      { label: 'Enable SMS Notifications', key: 'sms' },
                      { label: 'Enable AI Insights', key: 'ai' },
                      { label: 'Enable Demo Mode', key: 'demo' },
                    ].map(s => (
                      <label key={s.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">{s.label}</span>
                        <div className="w-11 h-6 bg-blue-600 rounded-full relative">
                          <div className="absolute top-1 left-6 w-4 h-4 bg-white rounded-full shadow" />
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => toast.success('System settings saved!')} className="btn-primary text-sm">
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              )}

              {/* Hospital Info */}
              {activeTab === 'hospital' && (
                <div className="premium-card p-6 space-y-5">
                  <h2 className="font-bold text-gray-900 text-lg">Hospital Information</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Hospital Name (English)', value: 'Prince Mohammed Bin Nasser Hospital' },
                      { label: 'Hospital Name (Arabic)', value: 'مستشفى الأمير محمد بن ناصر', dir: 'rtl' },
                      { label: 'Location', value: 'Jazan, Kingdom of Saudi Arabia' },
                      { label: 'Portal Name', value: 'Health and Nursing Research Unit' },
                      { label: 'Admin Email', value: 'research@pmnh.gov.sa' },
                      { label: 'Research Unit Phone', value: '+966 17 XXX XXXX' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="form-label">{f.label}</label>
                        <input defaultValue={f.value} dir={(f as {dir?: string}).dir} className="form-input" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => toast.success('Hospital information updated!')} className="btn-primary text-sm">
                    <Save className="w-4 h-4" />
                    Save Information
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
