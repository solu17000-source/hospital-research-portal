'use client'

/**
 * Global 404 page — fires for any path that doesn't match a route. Client
 * component so we can resolve the active language from the cookie at runtime
 * (server-side, the page would need to read cookies via next/headers; client
 * keeps it simple and avoids two render paths).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Compass, FileQuestion, Globe } from 'lucide-react'

type Lang = 'en' | 'ar'

export default function NotFound() {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
    setLang(m?.[1] === 'ar' ? 'ar' : 'en')
  }, [])

  const isAr = lang === 'ar'
  const t = isAr ? {
    code: '٤٠٤',
    title: 'الصفحة غير موجودة',
    body: 'الرابط الذي اتبعته إما تم نقله أو لم يكن موجودًا أبدًا. يمكنك العودة إلى لوحة التحكم أو تصفح البوابة العامة.',
    home: 'الرئيسية',
    dash: 'لوحة التحكم',
    visitor: 'البوابة العامة',
  } : {
    code: '404',
    title: 'Page not found',
    body: 'The link you followed was either moved or never existed. Head to your dashboard or browse the public portal.',
    home: 'Home',
    dash: 'Dashboard',
    visitor: 'Public portal',
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen flex items-center justify-center px-4 home-hero relative overflow-hidden"
    >
      <div className="home-hero-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="relative max-w-lg w-full bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 mb-5">
          <FileQuestion className="w-8 h-8" />
        </div>
        <p className="font-mono text-5xl font-bold text-blue-900 tabular-nums">{t.code}</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{t.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow"
          >
            <ArrowLeft className={isAr ? 'w-4 h-4 flip-rtl' : 'w-4 h-4'} />
            {t.home}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            <Compass className="w-4 h-4" />
            {t.dash}
          </Link>
          <Link
            href="/visitor"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {t.visitor}
          </Link>
        </div>
      </div>
    </div>
  )
}
