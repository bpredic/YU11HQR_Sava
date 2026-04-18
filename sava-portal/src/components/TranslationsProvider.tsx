'use client'

import { createContext, useContext, useMemo } from 'react'
import { getTranslations } from '@/lib/i18n/translations'
import type { Translations } from '@/lib/i18n/translations'
import type { Locale } from '@/lib/i18n'

type ContextValue = { t: Translations; locale: Locale }

const TranslationsContext = createContext<ContextValue | null>(null)

export function TranslationsProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const t = useMemo(() => getTranslations(locale), [locale])

  return (
    <TranslationsContext.Provider value={{ t, locale }}>
      {children}
    </TranslationsContext.Provider>
  )
}

export function useT(): Translations {
  const ctx = useContext(TranslationsContext)
  if (!ctx) throw new Error('useT must be used inside TranslationsProvider')
  return ctx.t
}

export function useLocale(): Locale {
  const ctx = useContext(TranslationsContext)
  if (!ctx) throw new Error('useLocale must be used inside TranslationsProvider')
  return ctx.locale
}
