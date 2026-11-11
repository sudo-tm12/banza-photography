// Site-wide facts (from BANZA's own materials) and URL helpers.
export const SITE = {
  name: 'BANZA Photography',
  founder: 'Mr Banza',
  tagline: 'Capturing today. Creating tomorrow.',
  promise: 'We capture special moments and freeze them in time.',
  more: 'More than just photos',
  email: 'banzaphotography@gmail.com',
  instagram: 'https://www.instagram.com/banza_photography/',
  instagramHandle: '@banza_photography',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sudo-tm12.github.io/banza-photography',
  apiBase: process.env.NEXT_PUBLIC_API_BASE ?? 'https://banza-api.tshedzawebdev.workers.dev',
}

/** Prefix plain asset URLs with the GitHub Pages base path (Next adds it to <Link> on its own). */
export const asset = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${p}`

export const NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/portfolio/', label: 'Portfolio', icon: 'grid' },
  { href: '/book/', label: 'Book', icon: 'calendar' },
  { href: '/models/', label: 'Models', icon: 'star' },
  { href: '/account/', label: 'Account', icon: 'user' },
] as const

// Booking policy, as on BANZA's booking and travel cards.
export const POLICY = {
  deposit: 'A 50% deposit of the agreed hourly rate secures your booking.',
  payment: 'Cash, card or bank transfer.',
  travel: [
    { band: 'under-5', label: 'Under 5 km', fee: 0 },
    { band: '5-10', label: '5–10 km', fee: 100 },
    { band: '10-15', label: '10–15 km', fee: 200 },
    { band: '15-20', label: '15–20 km', fee: 300 },
    { band: 'over-20', label: 'Further than 20 km', fee: null },
  ],
}

export const rand = (n: number) => `R${n.toLocaleString('en-ZA').replace(/,/g, ' ')}`
