/**
 * Top-level loading state — Next.js automatically renders this while any
 * server component below `/` is suspending. Replaces the blank-page flash
 * users would otherwise see between route transitions.
 *
 * Server component → zero client JS.
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center home-hero relative overflow-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="home-hero-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="relative text-center text-white">
        {/* Logo rendered as a CSS background so a missing public file shows
            nothing instead of a broken-image icon. */}
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-white/95 ring-1 ring-white/40 shadow-2xl bg-no-repeat bg-center bg-contain"
          style={{ backgroundImage: 'url(/jazan-health-cluster.jpg)' }}
          aria-hidden
        />
        <div className="inline-flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-blue-100 text-sm font-semibold tracking-wide">Loading…</span>
        </div>
        <p className="mt-2 text-blue-200/70 text-xs">PMNH Research Portal</p>
      </div>
    </div>
  )
}
