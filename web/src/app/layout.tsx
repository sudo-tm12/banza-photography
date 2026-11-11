import type { Metadata, Viewport } from 'next'
import { Cinzel, Cormorant_Garamond, Manrope, Pinyon_Script } from 'next/font/google'
import { Footer, Header, MobileDock } from '@/components/chrome'
import { GlassPointer, LiquidDefs } from '@/components/ui'
import { SITE, asset } from '@/lib/site'
import './globals.css'

// Self-hosted at build time. Cinzel echoes the logo's capitals, Cormorant is the editorial serif,
// Manrope does the work, Pinyon is the one script accent (as on BANZA's own quotation).
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', display: 'swap', weight: ['400', '500', '600'], style: ['normal', 'italic'] })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap', weight: ['500', '600', '700'] })
const pinyon = Pinyon_Script({ subsets: ['latin'], variable: '--font-pinyon', display: 'swap', weight: '400' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: portraits, events and models`, template: `%s · ${SITE.name}` },
  description: 'BANZA Photography by Mr Banza: portrait shoots, birthday parties, events and graduations. See the portfolio, book a shoot online, or apply to model with BANZA.',
  applicationName: SITE.name,
  openGraph: { type: 'website', locale: 'en_ZA', siteName: SITE.name, url: SITE.url, images: [{ url: asset('/og.png'), width: 1200, height: 630, alt: SITE.name }] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: asset('/icon.png'), apple: asset('/apple-touch-icon.png') },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = { themeColor: '#08080a', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${manrope.variable} ${cormorant.variable} ${cinzel.variable} ${pinyon.variable}`}>
      <body className="min-h-dvh overflow-x-clip">
        <LiquidDefs />
        <GlassPointer />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <MobileDock />
      </body>
    </html>
  )
}
