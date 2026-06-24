import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: 'MegaMarket — Tu marketplace de confianza',
    template: '%s | MegaMarket',
  },
  description: 'Encuentra miles de productos en electrónica, hogar, deportes, moda y más.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className="font-[family-name:var(--font-geist-sans)] antialiased bg-zinc-50 min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
