import type { NextConfig } from 'next'

// Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is "/banza-photography" while the site is
// served from sudo-tm12.github.io/banza-photography/, and empty once BANZA's own domain points here.
// Everything dynamic (accounts, bookings, applications, the dashboard) talks to the API in ../api.
const config: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
}

export default config
