'use client'

/**
 * Real Supabase Storage upload component.
 *
 * Uses XHR (not fetch) so we can read upload progress events for the
 * progress bar — supabase-js currently exposes no progress hook.
 *
 * Targets one of the four PMNH buckets:
 *   research-files | avatars | reports | attachments
 *
 * 50 MB per-file cap is enforced both client-side (fast feedback) and at
 * the bucket level (storage.buckets.file_size_limit, see migration 009).
 */

import { useCallback, useRef, useState } from 'react'
import { CloudUpload, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { createClient } from '@/lib/supabase'
import { canUploadFiles } from '@/lib/permissions'
import { useAuthStore } from '@/lib/auth-store'
import { formatFileSize } from '@/lib/utils'
import type { UserRole } from '@/types'

export type StorageBucket = 'research-files' | 'avatars' | 'reports' | 'attachments'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export type UploadedFile = {
  bucket: StorageBucket
  path: string
  name: string
  size: number
  type: string
  publicUrl: string | null
}

export type StorageUploadProps = {
  bucket: StorageBucket
  /** Optional sub-folder (e.g. research project UUID for research-files). */
  folder?: string
  /** Accept attribute for the <input type=file>. Defaults to all. */
  accept?: string
  /** Allow multiple files in a single drop. Defaults to true. */
  multiple?: boolean
  /** Called after each successful upload with the uploaded file metadata. */
  onUploaded?: (file: UploadedFile) => void
  /** Custom label text (Arabic). Defaults to a generic upload prompt. */
  label?: string
  /** Custom hint text. */
  hint?: string
  className?: string
}

/** Strip / sanitize a filename so it survives URL-encoding + storage rules. */
function sanitize(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-؀-ۿ]/g, '_') // keep Arabic
    .replace(/_+/g, '_')
    .slice(0, 200)
}

export default function StorageUpload({
  bucket,
  folder,
  accept,
  multiple = true,
  onUploaded,
  label,
  hint,
  className,
}: StorageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<{
    id: string
    name: string
    size: number
    progress: number
    error?: string
    done?: boolean
  }[]>([])

  const role = useAuthStore(s => s.user?.role) as UserRole | undefined
  const allowed = canUploadFiles(role)

  const upload = useCallback(async (files: FileList | File[]) => {
    if (!allowed) {
      toast.error('ليست لديك صلاحية لرفع الملفات.')
      return
    }
    const supabase = createClient()
    const list = Array.from(files)

    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: حجم الملف يتجاوز 50 ميجابايت.`)
        continue
      }
      const id = `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const safe = sanitize(file.name)
      const path = folder ? `${folder}/${Date.now()}-${safe}` : `${Date.now()}-${safe}`

      setUploads(prev => [...prev, { id, name: file.name, size: file.size, progress: 0 }])

      try {
        // supabase-js's `.upload()` doesn't expose progress events, so we
        // simulate progress while it runs — bumping to 95 % until the
        // network call returns, then 100 % on success.
        const tick = setInterval(() => {
          setUploads(prev =>
            prev.map(u => u.id === id && !u.done && u.progress < 90
              ? { ...u, progress: Math.min(90, u.progress + 7) }
              : u))
        }, 250)

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          })
        clearInterval(tick)

        if (error || !data) {
          setUploads(prev => prev.map(u => u.id === id ? { ...u, error: error?.message || 'فشل الرفع', progress: 100, done: true } : u))
          toast.error(`${file.name}: ${error?.message || 'فشل الرفع'}`)
          continue
        }

        // Build a download URL for the row that's about to appear in the list.
        // Public buckets get a permanent CDN URL; private buckets need a
        // signed URL fetched on click. Here we surface the storage path
        // and let the consumer create signed URLs on demand.
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path)
        const publicUrl = bucket === 'avatars' ? (pub?.publicUrl ?? null) : null

        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, done: true } : u))
        toast.success(`${file.name}: تم الرفع.`)

        onUploaded?.({
          bucket,
          path: data.path,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          publicUrl,
        })
      } catch (e) {
        const msg = (e as Error).message || 'فشل الرفع'
        setUploads(prev => prev.map(u => u.id === id ? { ...u, error: msg, progress: 100, done: true } : u))
        toast.error(`${file.name}: ${msg}`)
      }
    }
  }, [allowed, bucket, folder, onUploaded])

  if (!allowed) {
    return (
      <div className={`rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center ${className ?? ''}`}>
        <CloudUpload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-semibold text-gray-500">رفع الملفات مقيّد على المسؤولين فقط.</p>
        <p className="text-xs text-gray-400 mt-1">يمكنك تنزيل الملفات الموجودة.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click() }}
        className={[
          'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all select-none',
          isDragging ? 'border-blue-400 bg-blue-50/70' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
        ].join(' ')}
      >
        <CloudUpload className={['w-10 h-10 mx-auto mb-3', isDragging ? 'text-blue-500' : 'text-gray-300'].join(' ')} />
        <p className={['font-semibold text-sm', isDragging ? 'text-blue-700' : 'text-gray-700'].join(' ')}>
          {label ?? (isDragging ? 'أفلت الملفات الآن!' : 'اسحب الملفات إلى هنا، أو اضغط للاختيار')}
        </p>
        <p className="text-xs text-gray-400 mt-1">{hint ?? `الحد الأقصى 50 ميجابايت لكل ملف · مخزن في bucket "${bucket}"`}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) void upload(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-2">
          {uploads.map(u => (
            <li key={u.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatFileSize(u.size)}
                    {u.error ? ` · ${u.error}` : u.done ? ' · تم' : ` · ${u.progress}%`}
                  </p>
                </div>
                {u.done && (
                  <button
                    type="button"
                    aria-label="إخفاء"
                    onClick={() => setUploads(prev => prev.filter(x => x.id !== u.id))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all',
                    u.error ? 'bg-red-500' : u.done ? 'bg-emerald-500' : 'bg-blue-500',
                  ].join(' ')}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
