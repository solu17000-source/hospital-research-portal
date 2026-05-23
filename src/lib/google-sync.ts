/**
 * Google Sheets sync helpers.
 *
 * For public ("Anyone with the link can view") Google Sheets we use the
 * public CSV export endpoint, which requires no OAuth:
 *
 *     https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv
 *
 * For private sheets the Google Sheets API + OAuth would be needed; that
 * upgrade plugs into `fetchSheetCsv` later via a server-side credential.
 */

export type SheetRow = Record<string, string>

export type SyncParticipant = {
  id: string
  qr_id: string
  full_name?: string
  email?: string
  phone?: string
  department?: string
  employee_id?: string
  job_title?: string
  activity?: string
  registered_at?: string
  notes?: string
  source: 'google_sheet'
  sheet_id: string
  raw: SheetRow
}

export type SyncResult = {
  sheet_id: string
  fetched_at: string
  headers: string[]
  row_count: number
  participants: SyncParticipant[]
}

/** Extract the sheet ID from a Google Sheets URL or sharing link. */
export function extractSheetId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  // Already an id (44ish alnum chars + underscores/dashes)
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/)
  if (m) return m[1]
  return null
}

/** Extract the optional gid (worksheet) parameter, if any. */
export function extractGid(input: string): string | null {
  if (!input) return null
  const m = input.match(/[?#&]gid=(\d+)/)
  return m ? m[1] : null
}

export function buildCsvExportUrl(sheetId: string, gid?: string | null): string {
  const params = new URLSearchParams({ format: 'csv' })
  if (gid) params.set('gid', gid)
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?${params.toString()}`
}

/**
 * RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes (""),
 * embedded commas and embedded newlines. Does not assume any specific
 * locale — Google's export uses commas as separators regardless of sheet
 * locale when format=csv is requested.
 */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    const next = csv[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; continue }
      if (ch === '"') { inQuotes = false; continue }
      field += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\r') { continue } // ignore CR; LF triggers the row commit
    if (ch === '\n') {
      row.push(field); field = ''
      // Drop trailing all-empty rows entirely.
      if (row.some(c => c.length > 0)) rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  // Flush trailing field/row (file may end without final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some(c => c.length > 0)) rows.push(row)
  }
  return rows
}

/**
 * Build a header → canonical-column map. We match flexibly so the same
 * column name can appear as "Full Name", "full_name", "اسم كامل", etc.
 */
function canonicalize(header: string): keyof SyncParticipant | null {
  const h = header.trim().toLowerCase()
  if (!h) return null
  if (/email|e-?mail|بريد/.test(h)) return 'email'
  if (/(full[\s_-]*)?name|الاسم|اسم/.test(h) && !/dept|department|قسم/.test(h)) return 'full_name'
  if (/phone|mobile|tel|جوال|هاتف/.test(h)) return 'phone'
  if (/dept|department|قسم/.test(h)) return 'department'
  if (/employee|staff[\s_-]*id|emp[\s_-]*id|رقم[\s_-]*وظيفي|الرقم/.test(h)) return 'employee_id'
  if (/job|title|position|المسمى|مسمى/.test(h)) return 'job_title'
  if (/activity|session|workshop|course|نشاط|دورة|ورشة/.test(h)) return 'activity'
  if (/timestamp|time|date|تاريخ|وقت/.test(h)) return 'registered_at'
  if (/note|comment|ملاحظ/.test(h)) return 'notes'
  return null
}

export function rowsToParticipants(
  rows: string[][],
  qrId: string,
  sheetId: string,
): { headers: string[]; participants: SyncParticipant[] } {
  if (rows.length === 0) return { headers: [], participants: [] }
  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map(h => h.trim())
  const columnMap = headers.map(canonicalize)

  const participants: SyncParticipant[] = dataRows.map((cells, i) => {
    const raw: SheetRow = {}
    const record: Partial<SyncParticipant> = {}
    cells.forEach((cell, idx) => {
      const headerKey = headers[idx] ?? `col_${idx}`
      raw[headerKey] = cell.trim()
      const canon = columnMap[idx]
      if (canon) {
        // Don't overwrite — first matching header wins
        if (record[canon] === undefined) (record as Record<string, string>)[canon] = cell.trim()
      }
    })
    // Stable id: hash of email/employee_id when available, else row index.
    const idSource =
      record.email?.toLowerCase()
      ?? record.employee_id?.toUpperCase()
      ?? `${sheetId}:${i}`
    return {
      id: `gs-${stableHash(idSource)}`,
      qr_id: qrId,
      source: 'google_sheet',
      sheet_id: sheetId,
      raw,
      ...record,
    } satisfies SyncParticipant
  })

  return { headers, participants }
}

/** Tiny non-crypto hash — stable, short, deterministic. */
function stableHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619
  return (h >>> 0).toString(36)
}

/** Deduplicate incoming participants against an existing set by email > employee_id > id. */
export function mergeParticipants(
  existing: SyncParticipant[],
  incoming: SyncParticipant[],
): { merged: SyncParticipant[]; added: number; skipped: number } {
  const seen = new Map<string, SyncParticipant>()
  function keyOf(p: SyncParticipant) {
    return (p.email && p.email.toLowerCase())
      || (p.employee_id && p.employee_id.toUpperCase())
      || p.id
  }
  for (const p of existing) seen.set(keyOf(p), p)
  let added = 0, skipped = 0
  for (const p of incoming) {
    const k = keyOf(p)
    if (seen.has(k)) { skipped++; continue }
    seen.set(k, p)
    added++
  }
  return { merged: Array.from(seen.values()), added, skipped }
}
