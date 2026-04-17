'use client'

import { createContext, useContext } from 'react'
import type { Translations, Locale } from '@/lib/i18n'

type ContextValue = { t: Translations; locale: Locale }

const TranslationsContext = createContext<ContextValue | null>(null)

export function TranslationsProvider({
  translations,
  locale,
  children,
}: {
  translations: Translations
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <TranslationsContext.Provider value={{ t: translations, locale }}>
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
