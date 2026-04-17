import { cookies } from 'next/headers'
import { en } from './en'
import { sr } from './sr'

export type Locale = 'en' | 'sr'
export type Translations = typeof en

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const l = cookieStore.get('locale')?.value
  return l === 'sr' ? 'sr' : 'en'
}

export function getTranslations(locale: Locale): Translations {
  return locale === 'sr' ? sr : en
}
