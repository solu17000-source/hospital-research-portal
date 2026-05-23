import { NextResponse } from 'next/server'

import {
  buildCsvExportUrl,
  extractGid,
  extractSheetId,
  parseCsv,
  rowsToParticipants,
  type SyncResult,
} from '@/lib/google-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RequestBody = {
  qrId?: string
  sheetUrl?: string
}

// ---------------- Sliding-window rate limit (per IP) ----------------
//
// In-memory only — fine for a single-instance deployment and for development.
// In a multi-instance prod deployment swap this for Upstash / Redis so the
// counter is shared across replicas. The strict envelope per minute matches
// the public Google Sheets CSV endpoint's own friendly limits.
const RATE_LIMIT = 12          // requests
const RATE_WINDOW_MS = 60_000  // per minute
const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function rateCheck(ip: string): { ok: true; remaining: number; resetAt: number } | { ok: false; resetAt: number } {
  const now = Date.now()
  const bucket = buckets.get(ip)
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + RATE_WINDOW_MS
    buckets.set(ip, { count: 1, resetAt })
    return { ok: true, remaining: RATE_LIMIT - 1, resetAt }
  }
  if (bucket.count >= RATE_LIMIT) {
    return { ok: false, resetAt: bucket.resetAt }
  }
  bucket.count++
  return { ok: true, remaining: RATE_LIMIT - bucket.count, resetAt: bucket.resetAt }
}

// Periodic prune so the map doesn't grow unbounded over the process lifetime.
if (typeof globalThis !== 'undefined' && !(globalThis as { __pmnhRlPrune?: unknown }).__pmnhRlPrune) {
  (globalThis as { __pmnhRlPrune?: unknown }).__pmnhRlPrune = setInterval(() => {
    const now = Date.now()
    Array.from(buckets.entries()).forEach(([k, b]) => {
      if (b.resetAt <= now) buckets.delete(k)
    })
  }, 5 * 60_000)
}

/**
 * POST /api/google-sync
 *
 * Body: { qrId: string, sheetUrl: string }
 *
 * Fetches the public-shared Google Sheet at sheetUrl, parses rows into
 * participants, and returns them to the client. The client persists results
 * to localStorage (demo) or — when wired — writes them into the Supabase
 * `participants` table.
 *
 * Errors are reported as JSON with a non-2xx status code so the UI can show
 * the underlying message (sharing settings, network, etc.).
 */
export async function POST(request: Request) {
  // 1. Rate-limit gate
  const ip = clientIp(request)
  const rl = rateCheck(ip)
  if (!rl.ok) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
        },
      },
    )
  }

  // 2. Parse body
  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sheetUrl = body.sheetUrl?.trim()
  const qrId = body.qrId?.trim() || 'unassigned'
  if (!sheetUrl) return NextResponse.json({ error: 'sheetUrl is required' }, { status: 400 })

  const sheetId = extractSheetId(sheetUrl)
  if (!sheetId) {
    return NextResponse.json({ error: 'Could not extract Sheet ID from URL' }, { status: 400 })
  }
  const gid = extractGid(sheetUrl)
  const csvUrl = buildCsvExportUrl(sheetId, gid)

  let csv: string
  try {
    const upstream = await fetch(csvUrl, {
      headers: { Accept: 'text/csv' },
      // Don't follow private redirects; if the sheet isn't public, Google
      // bounces us to the login page (HTML) and we'll detect it below.
      redirect: 'follow',
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Google returned ${upstream.status}. Make sure the sheet is shared as "Anyone with the link can view".` },
        { status: 502 },
      )
    }

    const contentType = upstream.headers.get('content-type') || ''
    csv = await upstream.text()

    if (contentType.includes('text/html') || csv.trim().toLowerCase().startsWith('<!doctype')) {
      return NextResponse.json(
        { error: 'The sheet is not publicly shared. Share with "Anyone with the link can view" and retry.' },
        { status: 403 },
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Network error fetching sheet: ${(e as Error).message || 'unknown'}` },
      { status: 502 },
    )
  }

  const rows = parseCsv(csv)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Sheet appears to be empty' }, { status: 200 })
  }

  const { headers, participants } = rowsToParticipants(rows, qrId, sheetId)

  const result: SyncResult = {
    sheet_id: sheetId,
    fetched_at: new Date().toISOString(),
    headers,
    row_count: participants.length,
    participants,
  }
  return NextResponse.json(result, { status: 200 })
}
