import { en } from './en'
import { sr } from './sr'
import type { Locale } from './index'

export type Translations = typeof en

export function getTranslations(locale: Locale): Translations {
  return locale === 'sr' ? sr : en
}
