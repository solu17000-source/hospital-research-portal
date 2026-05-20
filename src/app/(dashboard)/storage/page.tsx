'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, Upload, File, FileText, Image, Search, Trash2, Download, FolderOpen, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatFileSize, formatDate } from '@/lib/utils'

const MOCK_FILES = [
  { id: '1', name: 'PMNH-2024-0001-IRB-Approval.pdf', type: 'pdf', size: 245120, research_id: 'PMNH-2024-0001', category: 'IRB Approval', uploaded_by: 'Sultan Alallah', uploaded_at: '2024-01-20', downloads: 5 },
  { id: '2', name: 'Nursing-Burnout-Data-Collection.xlsx', type: 'excel', size: 1048576, research_id: 'PMNH-2024-0002', category: 'Data Collection', uploaded_by: 'Afnan Bakri', uploaded_at: '2024-04-15', downloads: 3 },
  { id: '3', name: 'Antibiotic-Resistance-Manuscript-v3.docx', type: 'word', size: 524288, research_id: 'PMNH-2024-0003', category: 'Manuscript', uploaded_by: 'Dr. Khalid Al-Ghamdi', uploaded_at: '2026-04-01', downloads: 2 },
  { id: '4', name: 'Pediatric-Obesity-Protocol.pdf', type: 'pdf', size: 389120, research_id: 'PMNH-2024-0004', category: 'Research Protocol', uploaded_by: 'Dr. Fatima Al-Zahrani', uploaded_at: '2024-05-10', downloads: 7 },
  { id: '5', name: 'Cardiac-Rehabilitation-Consent.pdf', type: 'pdf', size: 102400, research_id: 'PMNH-2025-0005', category: 'Consent Form', uploaded_by: 'Dr. Mohammed Al-Asiri', uploaded_at: '2025-02-01', downloads: 4 },
  { id: '6', name: 'ICU-Hypertension-Publication.pdf', type: 'pdf', size: 786432, research_id: 'PMNH-2024-0001', category: 'Publication', uploaded_by: 'Sultan Alallah', uploaded_at: '2025-02-10', downloads: 12 },
  { id: '7', name: 'AI-Radiology-Ethics-Application.pdf', type: 'pdf', size: 307200, research_id: 'PMNH-2026-0008', category: 'Ethics Application', uploaded_by: 'Dr. Ibrahim Al-Dosari', uploaded_at: '2026-02-20', downloads: 1 },
]

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  excel: File,
  word: File,
  image: Image,
  pptx: File,
  default: File,
}

const FILE_COLORS: Record<string, string> = {
  pdf: 'text-red-500 bg-red-50',
  excel: 'text-green-600 bg-green-50',
  word: 'text-blue-600 bg-blue-50',
  pptx: 'text-orange-500 bg-orange-50',
  image: 'text-purple-500 bg-purple-50',
  default: 'text-gray-500 bg-gray-50',
}

const CATEGORIES = ['All', 'IRB Approval', 'Ethics Application', 'Consent Form', 'Research Protocol', 'Data Collection', 'Manuscript', 'Publication', 'Other']

export default function StoragePage() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [isDragging, setIsDragging] = useState(false)

  const filtered = MOCK_FILES.filter(f => {
    const q = search.toLowerCase()
    return (
      (!search || f.name.toLowerCase().includes(q) || f.research_id.toLowerCase().includes(q)) &&
      (catFilter === 'All' || f.category === catFilter)
    )
  })

  const totalSize = MOCK_FILES.reduce((a, f) => a + f.size, 0)
  const usedPercent = (totalSize / (10 * 1024 * 1024 * 1024)) * 100 // out of 10GB

  const handleUpload = () => toast.success('File upload dialog would open here (requires backend)')
  const handleDelete = (name: string) => toast.success(`${name} deleted`)
  const handleDownload = (name: string) => toast.success(`Downloading ${name}...`)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-blue-600" />
            File Storage
          </h1>
          <p className="page-subtitle">Manage research documents, attachments, and reports</p>
        </div>
        <button onClick={handleUpload} className="btn-primary text-sm">
          <Upload className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {/* Storage stats */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900">Storage Usage</p>
            <p className="text-sm text-gray-500">{formatFileSize(totalSize)} of 10 GB used</p>
          </div>
          <p className="text-sm font-bold text-blue-600">{usedPercent.toFixed(1)}%</p>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${Math.max(usedPercent, 2)}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'PDFs', count: MOCK_FILES.filter(f => f.type === 'pdf').length, color: 'red' },
            { label: 'Documents', count: MOCK_FILES.filter(f => f.type === 'word').length, color: 'blue' },
            { label: 'Spreadsheets', count: MOCK_FILES.filter(f => f.type === 'excel').length, color: 'green' },
            { label: 'Total Files', count: MOCK_FILES.length, color: 'purple' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="font-bold text-gray-900 text-lg">{s.count}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); toast.success('Files dropped! Uploading...') }}
        onClick={handleUpload}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        )}>
        <Upload className={cn('w-10 h-10 mx-auto mb-3', isDragging ? 'text-blue-500' : 'text-gray-300')} />
        <p className="font-semibold text-gray-700 text-sm">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports PDF, Word, Excel, PowerPoint, Images · Max 50MB per file
        </p>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..." className="form-input pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.slice(0, 6).map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={cn('px-3 py-1.5 text-xs rounded-lg border font-medium transition-all',
                catFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:border-gray-300')}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Files table */}
      <div className="premium-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Research</th>
              <th>Category</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th>Size</th>
              <th>Downloads</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((file, i) => {
              const Icon = FILE_ICONS[file.type] || FILE_ICONS.default
              const colorClass = FILE_COLORS[file.type] || FILE_COLORS.default
              return (
                <motion.tr key={file.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{file.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-blue-600">{file.research_id}</span></td>
                  <td><span className="text-xs text-gray-600">{file.category}</span></td>
                  <td><span className="text-xs text-gray-600">{file.uploaded_by}</span></td>
                  <td><span className="text-xs text-gray-500">{formatDate(file.uploaded_at)}</span></td>
                  <td><span className="text-xs text-gray-500">{formatFileSize(file.size)}</span></td>
                  <td><span className="text-sm font-semibold text-gray-700">{file.downloads}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleDownload(file.name)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(file.name)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
