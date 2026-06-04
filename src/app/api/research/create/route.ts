/**
 * POST /api/research/create  — Option-2 fallback for createResearch.
 *
 * Runs server-side, uses SUPABASE_SERVICE_ROLE_KEY to insert (so it
 * bypasses RLS), but ALWAYS first verifies the caller's identity by
 * validating the Authorization Bearer token against Supabase's
 * `getUser` API. The userId stored as `created_by` is the one Supabase
 * just confirmed owns the token — NOT a value supplied by the client
 * body. That keeps the route safe even though it has service-role
 * power: a malicious client cannot impersonate another user.
 *
 * The primary `createResearch` path in data-source.ts hits this route
 * automatically when the direct PostgREST POST fails with a network
 * error, an AbortController timeout, or a 401/403.
 *
 * Required env var on Vercel: SUPABASE_SERVICE_ROLE_KEY  (server-only,
 * MUST NOT be prefixed `NEXT_PUBLIC_`). If it is missing the route
 * returns 500 with a clear error so the operator sees what needs to
 * be configured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PMNH_SUPABASE_URL  = 'https://owcgtvobxpystflqmyij.supabase.co'
const PMNH_SUPABASE_ANON = 'sb_publishable_bA9xnDC9Rjin5OzjGAT4kQ_sh4_4Hcx'

export async function POST(req: NextRequest) {
  console.log('[api/research/create] request received')

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || PMNH_SUPABASE_URL
  const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PMNH_SUPABASE_ANON
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SERVICE_KEY) {
    console.error('[api/research/create] SUPABASE_SERVICE_ROLE_KEY not set on the server')
    return NextResponse.json(
      { error: 'Service-role fallback not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel env.' },
      { status: 500 },
    )
  }

  // 1. Validate the caller's JWT.
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[api/research/create] missing Authorization header')
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }
  const accessToken = authHeader.slice(7)

  // anon client so we can hit auth.getUser(token) to verify the JWT
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken)
  if (userErr || !userData?.user) {
    console.error('[api/research/create] invalid token:', userErr?.message)
    return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
  }
  console.log('[api/research/create] token verified for user:', userData.user.id)

  // 2. Read body.
  let body: { payload?: Record<string, unknown> }
  try {
    body = await req.json() as { payload?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body?.payload || typeof body.payload !== 'object') {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }
  if (!body.payload.title || typeof body.payload.title !== 'string') {
    return NextResponse.json({ error: 'payload.title is required' }, { status: 400 })
  }

  // 3. Insert with service-role power. created_by is stamped from the
  //    verified user id — NEVER trusted from the client body.
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const insertPayload = {
    ...body.payload,
    created_by: userData.user.id,
  }

  const { data, error } = await adminClient
    .from('research_projects')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) {
    console.error('[api/research/create] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[api/research/create] saved:', data.research_id, data.id)
  return NextResponse.json({ row: data })
}
