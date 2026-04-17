import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TranslationsProvider } from '@/components/TranslationsProvider'
import { getLocale, getTranslations } from '@/lib/i18n'

const outfit = Outfit({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Sava River Days 2026 – HAM Contest Portal',
  description: 'Amateur radio contest portal for Sava River Days 2026. Upload logs, track QSOs, and download your diploma.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const translations = getTranslations(locale)

  return (
    <html lang={locale} className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TranslationsProvider translations={translations} locale={locale}>
            {children}
            <Toaster richColors position="top-right" />
          </TranslationsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
