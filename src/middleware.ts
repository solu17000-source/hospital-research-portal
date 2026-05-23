import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Routes a visitor session is allowed to read. Anything else is bounced back
 * to /visitor with a query param explaining the reason.
 */
const VISITOR_PUBLIC_PREFIXES = ['/', '/visitor', '/login', '/forgot-password', '/api/google-sync']

/** Routes the middleware skips entirely (assets, Next internals). */
const SKIP_PREFIXES = ['/_next', '/api/_next', '/favicon', '/hospital-logo', '/jazan-health-cluster']

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return VISITOR_PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isSkipped(pathname: string): boolean {
  return SKIP_PREFIXES.some(p => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isSkipped(pathname)) return NextResponse.next()

  const isVisitor = request.cookies.get('pmnh-visitor')?.value === '1'

  // Visitors get the public surface only. Any attempt to deep-link into a
  // protected area bounces back to /visitor with an explanation. This is the
  // server-side counterpart to the client-side auth-store gate in the
  // (dashboard) layout — together they make the visitor restriction real.
  if (isVisitor && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/visitor'
    url.searchParams.set('blocked', '1')
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     *  - _next/static, _next/image, favicon assets
     *  - Static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$).*)',
  ],
}
