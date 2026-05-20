import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | undefined, fmt = 'MMM d, yyyy'): string {
  if (!date) return 'N/A'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return 'Invalid date'
  }
}

export function timeAgo(date: string | Date | undefined): string {
  if (!date) return 'N/A'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return 'N/A'
  }
}

export function isOverdue(date: string | undefined): boolean {
  if (!date) return false
  return isBefore(parseISO(date), new Date())
}

export function daysUntil(date: string | undefined): number {
  if (!date) return 0
  const d = parseISO(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatCurrency(amount: number | undefined, currency = 'SAR'): string {
  if (amount === undefined || amount === null) return 'N/A'
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateResearchId(year?: number): string {
  const y = year || new Date().getFullYear()
  const num = Math.floor(Math.random() * 9000) + 1000
  return `PMNH-${y}-${num}`
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    delayed: 'bg-orange-100 text-orange-800 border-orange-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    on_hold: 'bg-gray-100 text-gray-700 border-gray-200',
    pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    not_required: 'bg-gray-100 text-gray-600 border-gray-200',
    Q1: 'bg-purple-100 text-purple-800 border-purple-200',
    Q2: 'bg-blue-100 text-blue-800 border-blue-200',
    Q3: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    Q4: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  }
  return map[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }
  return map[priority] || 'bg-gray-100 text-gray-600'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function roleCanEdit(role: string): boolean {
  return ['admin', 'research_director', 'department_head', 'research_coordinator', 'authorized_staff'].includes(role)
}

export function roleCanManageUsers(role: string): boolean {
  return ['admin'].includes(role)
}

export function roleCanViewConfidential(role: string): boolean {
  return ['admin', 'research_director', 'department_head', 'research_coordinator'].includes(role)
}
