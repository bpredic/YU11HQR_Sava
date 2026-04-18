import { cookies } from 'next/headers'

export type Locale = 'en' | 'sr'

export { getTranslations } from './translations'
export type { Translations } from './translations'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const l = cookieStore.get('locale')?.value
  return l === 'sr' ? 'sr' : 'en'
}
