'use client'

/**
 * Global error boundary — fires when a render in any nested segment throws.
 * Must be a Client Component (Next.js requirement). Renders branded, bilingual
 * fallback with a Try-again button that re-mounts the failed tree.
 */
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react'

export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production this is the hook to forward to Sentry / DataDog / etc.
    console.error('[app/error]', error)
  }, [error])

  // Read language preference at runtime — no hooks/contexts in this scope.
  const isAr = typeof document !== 'undefined'
    && /(?:^|;\s*)lang=ar/.test(document.cookie)

  const t = isAr ? {
    title: 'حدث خطأ غير متوقع',
    body: 'تم تسجيل الخطأ ومراجعته. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.',
    retry: 'إعادة المحاولة',
    home: 'العودة إلى الرئيسية',
    ref: 'مرجع الخطأ',
  } : {
    title: 'Something went wrong',
    body: 'The error has been logged for review. You can retry the action or return to the home page.',
    retry: 'Try again',
    home: 'Go home',
    ref: 'Error reference',
  }

  return (
    <html lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'}>
      <body style={{ margin: 0 }}>
        <div className="min-h-screen flex items-center justify-center px-4 home-hero">
          <div className="home-hero-grid absolute inset-0 opacity-40" aria-hidden />
          <div className="relative max-w-lg w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-600 mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t.body}</p>
            {error.digest && (
              <p className="mt-3 text-[11px] text-gray-400 font-mono">
                {t.ref}: {error.digest}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow"
              >
                <RotateCw className="w-4 h-4" />
                {t.retry}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.home}
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
