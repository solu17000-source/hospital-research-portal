'use client'

/**
 * Real Supabase Storage browser.
 *
 * Lists every object across the four PMNH buckets (research-files, avatars,
 * reports, attachments), with download / delete actions gated by role:
 *   • Anyone authenticated → download
 *   • super_admin + admin → upload (via the StorageUpload component)
 *   • super_admin only → delete
 *
 * Zero demo data. If a bucket is empty the user sees an empty state, not
 * placeholder rows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Download, File as FileIcon, FileSpreadsheet, FileText, Filter,
  HardDrive, Image as ImageIcon, Languages, Search, Trash2,
} from 'lucide-react'

import StorageUpload, { type StorageBucket } from '@/components/storage/StorageUpload'
import { useAuthStore } from '@/lib/auth-store'
import { createClient } from '@/lib/supabase'
import { canDeleteFiles, canUploadFiles } from '@/lib/permissions'
import { cn, formatDate, formatFileSize } from '@/lib/utils'
import type { UserRole } from '@/types'

type Lang = 'en' | 'ar'

type StorageRow = {
  id: string                  // synthetic uid for React keys
  bucket: StorageBucket
  path: string                // storage path within the bucket
  name: string                // display name (basename of path)
  size: number
  mime: string
  updated_at: string
}

const BUCKETS: { id: StorageBucket; labelEn: string; labelAr: string }[] = [
  { id: 'research-files', labelEn: 'Research files', labelAr: 'ملفات الأبحاث' },
  { id: 'avatars',        labelEn: 'Avatars',        labelAr: 'الصور الشخصية' },
  { id: 'reports',        labelEn: 'Reports',        labelAr: 'التقارير' },
  { id: 'attachments',    labelEn: 'Attachments',    labelAr: 'المرفقات' },
]

const T = {
  en: {
    title: 'File Storage',
    subtitle: 'Real Supabase Storage — every object across all buckets.',
    languageBtn: 'العربية',
    refresh: 'Refresh',
    upload: 'Upload to',
    searchPh: 'Search by file name…',
    allBuckets: 'All buckets',
    colFile: 'File',
    colBucket: 'Bucket',
    colSize: 'Size',
    colUpdated: 'Last modified',
    colActions: 'Actions',
    empty: 'No files yet — drop one above to upload.',
    download: 'Download',
    deleteBtn: 'Delete',
    deleteConfirm: 'Delete this file? This cannot be undone.',
    deleted: 'Deleted.',
    deleteFailed: 'Delete failed: {msg}',
    refreshing: 'Refreshing…',
    loading: 'Loading files…',
  },
  ar: {
    title: 'تخزين الملفات',
    subtitle: 'تخزين Supabase الحقيقي — كل الملفات في كل الحاويات.',
    languageBtn: 'English',
    refresh: 'تحديث',
    upload: 'رفع إلى',
    searchPh: 'ابحث باسم الملف…',
    allBuckets: 'كل الحاويات',
    colFile: 'الملف',
    colBucket: 'الحاوية',
    colSize: 'الحجم',
    colUpdated: 'آخر تحديث',
    colActions: 'إجراءات',
    empty: 'لا توجد ملفات بعد — اسحب ملفًا لرفعه.',
    download: 'تنزيل',
    deleteBtn: 'حذف',
    deleteConfirm: 'هل ترغب في حذف هذا الملف نهائيًا؟',
    deleted: 'تم الحذف.',
    deleteFailed: 'فشل الحذف: {msg}',
    refreshing: 'جاري التحديث…',
    loading: 'جاري تحميل الملفات…',
  },
} as const

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}
function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function iconForMime(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon
  if (mime.includes('spreadsheet') || mime === 'text/csv') return FileSpreadsheet
  if (mime === 'application/pdf' || mime.includes('word') || mime.startsWith('text/')) return FileText
  return FileIcon
}

export default function StoragePage() {
  const role = useAuthStore(s => s.user?.role) as UserRole | undefined
  const canDelete = canDeleteFiles(role)
  const canUpload = canUploadFiles(role)

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang]
  const isRtl = lang === 'ar'

  const [rows, setRows] = useState<StorageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bucketFilter, setBucketFilter] = useState<StorageBucket | 'all'>('all')
  const [uploadBucket, setUploadBucket] = useState<StorageBucket>('research-files')

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const collected: StorageRow[] = []
    try {
      for (const b of BUCKETS) {
        const { data, error } = await supabase.storage
          .from(b.id)
          .list('', { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } })
        if (error) {
          console.error(`[storage] list ${b.id} error:`, error)
          continue
        }
        for (const obj of data ?? []) {
          // The list() call returns folders as entries with metadata=null; skip.
          if (!obj.id || !obj.metadata) continue
          collected.push({
            id: `${b.id}/${obj.id}`,
            bucket: b.id,
            path: obj.name,
            name: obj.name.split('/').pop() ?? obj.name,
            size: (obj.metadata.size as number) ?? 0,
            mime: (obj.metadata.mimetype as string) ?? 'application/octet-stream',
            updated_at: obj.updated_at ?? obj.created_at ?? new Date().toISOString(),
          })
        }
      }
    } catch (e) {
      console.error('[storage] load threw:', e)
    } finally {
      setRows(collected)
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadFiles() }, [loadFiles])

  const filtered = useMemo(() => {
    return rows
      .filter(r => bucketFilter === 'all' ? true : r.bucket === bucketFilter)
      .filter(r => !search ? true : r.name.toLowerCase().includes(search.toLowerCase()))
  }, [rows, bucketFilter, search])

  const totals = useMemo(() => {
    const totalSize = rows.reduce((sum, r) => sum + r.size, 0)
    const perBucket = BUCKETS.map(b => ({
      bucket: b,
      count: rows.filter(r => r.bucket === b.id).length,
      size: rows.filter(r => r.bucket === b.id).reduce((sum, r) => sum + r.size, 0),
    }))
    return { totalSize, perBucket }
  }, [rows])

  async function handleDownload(row: StorageRow) {
    const supabase = createClient()
    // Private buckets need a signed URL; public (avatars) gets a direct URL.
    if (row.bucket === 'avatars') {
      const { data } = supabase.storage.from(row.bucket).getPublicUrl(row.path)
      if (data?.publicUrl) window.open(data.publicUrl, '_blank')
      return
    }
    const { data, error } = await supabase.storage
      .from(row.bucket)
      .createSignedUrl(row.path, 60) // valid 60s
    if (error || !data?.signedUrl) {
      toast.error(`Could not get download URL: ${error?.message ?? 'unknown'}`)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(row: StorageRow) {
    if (!canDelete) {
      toast.error('الحذف مقيّد على المسؤول العام فقط.')
      return
    }
    if (!confirm(t.deleteConfirm)) return
    const supabase = createClient()
    const { error } = await supabase.storage.from(row.bucket).remove([row.path])
    if (error) {
      toast.error(format(t.deleteFailed, { msg: error.message }))
      return
    }
    setRows(prev => prev.filter(r => r.id !== row.id))
    toast.success(t.deleted)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-blue-600" />
            {t.title}
          </h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="btn-secondary text-sm"
          >
            <Languages className="w-4 h-4" />
            {t.languageBtn}
          </button>
          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? t.refreshing : t.refresh}
          </button>
        </div>
      </div>

      {/* Bucket summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {totals.perBucket.map(({ bucket, count, size }) => (
          <div key={bucket.id} className="premium-card p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {lang === 'ar' ? bucket.labelAr : bucket.labelEn}
            </p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{count}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatFileSize(size)}</p>
          </div>
        ))}
      </div>

      {/* Upload box — only if user can upload */}
      {canUpload && (
        <div className="premium-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-700">{t.upload}:</span>
            <select
              value={uploadBucket}
              onChange={e => setUploadBucket(e.target.value as StorageBucket)}
              className="form-input w-auto"
            >
              {BUCKETS.map(b => (
                <option key={b.id} value={b.id}>{lang === 'ar' ? b.labelAr : b.labelEn}</option>
              ))}
            </select>
          </div>
          <StorageUpload
            bucket={uploadBucket}
            onUploaded={() => void loadFiles()}
          />
        </div>
      )}

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPh}
            className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')}
          />
        </div>
        <select
          value={bucketFilter}
          onChange={e => setBucketFilter(e.target.value as StorageBucket | 'all')}
          className="form-input w-auto min-w-[180px]"
        >
          <option value="all">{t.allBuckets}</option>
          {BUCKETS.map(b => (
            <option key={b.id} value={b.id}>{lang === 'ar' ? b.labelAr : b.labelEn}</option>
          ))}
        </select>
      </div>

      {/* File table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[260px]">{t.colFile}</th>
                <th>{t.colBucket}</th>
                <th>{t.colSize}</th>
                <th>{t.colUpdated}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <div className="w-10 h-10 mx-auto mb-2 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    {t.loading}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <FileIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-gray-700">{t.empty}</p>
                  </td>
                </tr>
              ) : (
                filtered.map(row => {
                  const Icon = iconForMime(row.mime)
                  const bucket = BUCKETS.find(b => b.id === row.bucket)!
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{row.mime}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {lang === 'ar' ? bucket.labelAr : bucket.labelEn}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-600 tabular-nums">{formatFileSize(row.size)}</span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-500">{formatDate(row.updated_at)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDownload(row)}
                            title={t.download}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(row)}
                              title={t.deleteBtn}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
