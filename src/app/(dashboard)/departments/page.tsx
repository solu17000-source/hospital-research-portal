'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Edit2, Trash2, Users, FlaskConical, BookOpen, TrendingUp, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { DEMO_DEPARTMENTS, DEMO_RESEARCH } from '@/lib/demo-data'
import type { Department } from '@/types'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DepartmentsPage() {
  const [depts, setDepts] = useState(DEMO_DEPARTMENTS)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState({ name: '', code: '', color: '#2563eb', description: '' })

  const getStats = (deptId: string) => {
    const research = DEMO_RESEARCH.filter(r => r.department_id === deptId)
    return {
      total: research.length,
      active: research.filter(r => r.status === 'active').length,
      published: research.filter(r => r.publication_status === 'published').length,
      score: Math.floor(Math.random() * 30) + 70,
    }
  }

  const handleSave = () => {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return }
    if (editing) {
      setDepts(d => d.map(dept => dept.id === editing.id ? { ...dept, ...form } : dept))
      toast.success('Department updated successfully')
    } else {
      const newDept: Department = {
        id: `d${depts.length + 1}`,
        ...form,
        icon: 'building',
        research_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setDepts(d => [...d, newDept])
      toast.success('Department created successfully')
    }
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', code: '', color: '#2563eb', description: '' })
  }

  const handleEdit = (dept: Department) => {
    setEditing(dept)
    setForm({ name: dept.name, code: dept.code, color: dept.color, description: dept.description || '' })
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    setDepts(d => d.filter(dept => dept.id !== id))
    toast.success('Department deleted')
  }

  const chartData = depts.slice(0, 8).map(d => {
    const stats = getStats(d.id)
    return { name: d.code, projects: stats.total, published: stats.published, score: stats.score }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Department Management</h1>
          <p className="page-subtitle">{depts.length} hospital departments · Manage research units and performance</p>
        </div>
        <button onClick={() => { setShowModal(true); setEditing(null); setForm({ name: '', code: '', color: '#2563eb', description: '' }) }}
          className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Performance chart */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Department Research Performance</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="projects" name="Total Projects" fill="#3b82f6" radius={[3,3,0,0]} />
            <Bar dataKey="published" name="Published" fill="#22c55e" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {depts.map((dept, i) => {
          const stats = getStats(dept.id)
          return (
            <motion.div key={dept.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="premium-card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: dept.color + '20', border: `2px solid ${dept.color}40` }}>
                    <Building2 className="w-6 h-6" style={{ color: dept.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{dept.name}</h3>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{dept.code}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(dept)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(dept.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Projects', value: stats.total, icon: FlaskConical, color: 'blue' },
                  { label: 'Active', value: stats.active, icon: TrendingUp, color: 'green' },
                  { label: 'Published', value: stats.published, icon: BookOpen, color: 'purple' },
                  { label: 'Score', value: `${stats.score}%`, icon: TrendingUp, color: 'orange' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="font-bold text-gray-900 text-sm">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Performance bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Performance Score</span>
                  <span className="font-semibold" style={{ color: dept.color }}>{stats.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: dept.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.score}%` }}
                    transition={{ duration: 1, delay: i * 0.05 }} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditing(null) } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Edit Department' : 'Add New Department'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditing(null) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Department Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Internal Medicine" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Department Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., INT-MED" className="form-input font-mono" maxLength={10} />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief department description..." rows={2} className="form-input resize-none" />
                </div>
                <div>
                  <label className="form-label">Department Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                    <span className="text-sm text-gray-600">{form.color}</span>
                    <div className="flex-1 h-8 rounded-lg" style={{ background: form.color }} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); setEditing(null) }}
                  className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex-1">
                  <Save className="w-4 h-4" />
                  {editing ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
