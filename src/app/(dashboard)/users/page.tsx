'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit2, Trash2, Shield, Search, X, Save, Lock, CheckCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { DEMO_USERS, DEMO_DEPARTMENTS } from '@/lib/demo-data'
import type { Profile, UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'
import { cn, getInitials, formatDate, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  research_director: 'bg-purple-100 text-purple-700 border-purple-200',
  department_head: 'bg-blue-100 text-blue-700 border-blue-200',
  research_coordinator: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  authorized_staff: 'bg-green-100 text-green-700 border-green-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<Profile[]>(DEMO_USERS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', username: '', phone: '',
    role: 'authorized_staff' as UserRole, department_id: '', is_active: true,
  })

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const isAdmin = currentUser?.role === 'admin'

  const handleSave = () => {
    if (!form.full_name || !form.email) { toast.error('Name and email are required'); return }
    if (editingUser) {
      setUsers(u => u.map(usr => usr.id === editingUser.id ? { ...usr, ...form } : usr))
      toast.success('User updated successfully')
    } else {
      const newUser: Profile = {
        id: `u${users.length + 1}`,
        ...form,
        login_count: 0,
        is_active: true,
        email_verified: false,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUsers(u => [...u, newUser])
      toast.success('User created successfully')
    }
    setShowModal(false)
    setEditingUser(null)
    setForm({ full_name: '', email: '', username: '', phone: '', role: 'authorized_staff', department_id: '', is_active: true })
  }

  const handleEdit = (user: Profile) => {
    setEditingUser(user)
    setForm({ full_name: user.full_name, email: user.email, username: user.username, phone: user.phone || '', role: user.role, department_id: user.department_id || '', is_active: user.is_active })
    setShowModal(true)
  }

  const handleToggleActive = (id: string) => {
    setUsers(u => u.map(usr => usr.id === id ? { ...usr, is_active: !usr.is_active } : usr))
    toast.success('User status updated')
  }

  const handleResetPassword = (user: Profile) => {
    toast.success(`Password reset link sent to ${user.email}`)
  }

  const roleCounts = Object.fromEntries(
    (Object.keys(ROLE_LABELS) as UserRole[]).map(role => [role, users.filter(u => u.role === role).length])
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Users & Roles
          </h1>
          <p className="page-subtitle">{users.length} registered users · Role-based access control</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowModal(true); setEditingUser(null) }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Role distribution */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <div key={role} className="premium-card p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{roleCounts[role] || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label.split('/')[0].trim()}</p>
            <span className={cn('badge text-xs mt-1', ROLE_COLORS[role])}>{role.split('_')[0]}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="premium-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="form-input pl-9" />
        </div>
      </div>

      {/* Users table */}
      <div className="premium-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Logins</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                      {getInitials(user.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{user.username}</span>
                </td>
                <td>
                  <span className={cn('badge text-xs capitalize', ROLE_COLORS[user.role])}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td>
                  <span className="text-xs text-gray-600">
                    {DEMO_DEPARTMENTS.find(d => d.id === user.department_id)?.name || 'N/A'}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', user.is_active ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-xs text-gray-600">{user.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </td>
                <td>
                  <span className="text-xs text-gray-500">{user.last_login ? timeAgo(user.last_login) : 'Never'}</span>
                </td>
                <td>
                  <span className="text-sm font-semibold text-gray-700">{user.login_count}</span>
                </td>
                {isAdmin && (
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(user)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleResetPassword(user)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all" title="Reset password">
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(user.id)}
                        className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
                          user.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        )}>
                        {user.is_active ? <X className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Dr. Full Name" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@pmnh.gov.sa" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Username *</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="username" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+966 5X XXX XXXX" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                    className="form-input">
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                      <option key={role} value={role}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                    className="form-input">
                    <option value="">Select department</option>
                    {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex-1">
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
