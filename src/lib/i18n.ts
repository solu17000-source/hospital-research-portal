'use client'

/**
 * Shared bilingual primitives.
 *
 * Every page that needs EN/AR copy duplicates the same three pieces of glue:
 *   1) read the `lang` cookie
 *   2) keep React state in sync + write the cookie back on toggle
 *   3) a `format()` helper for {placeholder} interpolation
 *
 * This file extracts those into one place so new pages stay tiny.
 *
 *   import { useLang, format } from '@/lib/i18n'
 *   const { lang, isRtl, toggle, t } = useLang(MY_DICT)
 *   <p>{format(t.welcome, { name: user.full_name })}</p>
 */

import { useEffect, useState, useCallback } from 'react'

export type Lang = 'en' | 'ar'

/** Read the persisted language preference. Falls back to `en`. */
export function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}

/** Write the language preference for ~1 year. */
export function writeLangCookie(lang: Lang) {
  if (typeof document === 'undefined') return
  document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/** Simple `{placeholder}` interpolator. Missing keys substitute the empty string. */
export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

/**
 * Dictionary shape every page declares:
 *   const DICT = { en: { hello: 'Hello' }, ar: { hello: 'مرحبا' } } as const
 *
 * The widened `T` returned by `useLang` lets it be passed across component
 * boundaries without TypeScript narrowing each key to its literal English
 * value.
 */
export type Dict<K extends string> = { en: Record<K, string>; ar: Record<K, string> }
export type Strings<K extends string> = Record<K, string>

export function useLang<K extends string>(dict: Dict<K>) {
  const [lang, setLang] = useState<Lang>('en')

  // Hydrate from cookie after mount. The server already set <html dir> for us
  // via the root layout — we just sync local state for client interactions.
  useEffect(() => {
    setLang(readLangCookie())
  }, [])

  // Persist on every change.
  useEffect(() => {
    writeLangCookie(lang)
  }, [lang])

  const toggle = useCallback(
    () => setLang(prev => (prev === 'en' ? 'ar' : 'en')),
    [],
  )

  const t: Strings<K> = dict[lang]
  return { lang, isRtl: lang === 'ar', setLang, toggle, t }
}
