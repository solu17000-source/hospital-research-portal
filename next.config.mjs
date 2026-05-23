/**
 * Production security headers.
 *
 * CSP is intentionally NOT set here. Next.js dev mode and pptxgenjs require
 * `unsafe-inline` / `unsafe-eval` which weakens CSP enough that it provides
 * limited value; production deployments should set a CSP at the reverse
 * proxy (Vercel/Nginx) tuned to the actual deployment domain.
 */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    // Camera retained because QR scanning uses it; geolocation/microphone/payment off.
    value: 'camera=(self), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Hide "X-Powered-By: Next.js" — reduces fingerprinting.
  // Build a standalone, minimal Node runtime in .next/standalone/ so the
  // Dockerfile only needs to copy that folder (not the whole node_modules).
  output: 'standalone',
  images: {
    domains: ['localhost', 'supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to every path. Static asset routes are unaffected by these
        // (no Set-Cookie / no auth) so applying broadly is safe.
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
