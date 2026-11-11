'use client'
// Small shared pieces: icons, the logo, the liquid-glass SVG defs and pointer light, toasts.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { asset } from '@/lib/site'

const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7 M5 10v10h14V10',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  calendar: 'M4 5h16v16H4z M4 10h16 M9 3v4 M15 3v4',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  user: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21a8 8 0 0 1 16 0',
  camera: 'M4 8h4l2-3h4l2 3h4v12H4z M12 10.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M17.5 6.5h.01',
  tiktok: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5 M14 3c.5 2.8 2.4 4.6 5 5',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z',
  whatsapp: 'M4 20l1.4-4A8 8 0 1 1 8 18.6z M9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  pin: 'M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2',
  car: 'M5 16h14 M6 16l1.5-5h9L18 16 M7 19a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3z M17 19a1.5 1.5 0 1 0 0-3a1.5 1.5 0 1 0 0 3z',
  card: 'M3 6h18v12H3z M3 10h18 M7 15h4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  logout: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
  chevron: 'M9 6l6 6-6 6',
  chevronL: 'M15 6l-6 6 6 6',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  gift: 'M4 11h16v9H4z M3 7h18v4H3z M12 7v13 M12 7c-1.5-3-5-3-5-1 0 1.5 3 1 5 1z M12 7c1.5-3 5-3 5-1 0 1.5-3 1-5 1z',
  users: 'M9 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M2 21a7 7 0 0 1 14 0 M16 4a4 4 0 0 1 0 8 M18 14a6 6 0 0 1 4 7',
  cap: 'M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M19 12l2-1-1-3-2 .2-1.3-1.3.2-2-3-1-1 2h-1.8l-1-2-3 1 .2 2L6 8.2 4 8 3 11l2 1v1.8l-2 1 1 3 2-.2 1.3 1.3-.2 2 3 1 1-2h1.8l1 2 3-1-.2-2 1.3-1.3 2 .2 1-3-2-1z',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  refresh: 'M20 11a8 8 0 0 0-15-3 M4 4v4h4 M4 13a8 8 0 0 0 15 3 M20 20v-4h-4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  lock: 'M6 11h12v10H6z M8 11V8a4 4 0 0 1 8 0v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
}
export function Icon({ name, size = 22, stroke = 1.8, className = '' }: { name: keyof typeof PATHS | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

/** The chrome BANZA wordmark (their logo file, with its black background made transparent). */
export function Wordmark({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset('/img/brand/wordmark-alpha.webp')} alt="BANZA Photography" width={1200} height={400} className={`select-none ${className}`} fetchPriority={priority ? 'high' : undefined} draggable={false} />
  )
}

export function LogoLink({ className = '' }: { className?: string }) {
  return (
    <Link href="/" aria-label="BANZA Photography: home" className={`flex items-center ${className}`}>
      <span className="font-display text-[1.15rem] font-semibold tracking-[0.18em] chrome-text">BANZA</span>
      <span className="ml-2 hidden text-[0.6rem] font-semibold tracking-[0.42em] text-chrome-3 sm:inline">PHOTOGRAPHY</span>
    </Link>
  )
}

/** SVG filter used by .glass.refract in Chromium: a gentle lens bend of what's behind the glass. */
export function LiquidDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="34" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

/** Moves each glass panel's highlight towards the pointer (desktop only; static on touch). */
export function GlassPointer() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    let raf = 0
    const on = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = (e.target as HTMLElement | null)?.closest?.('.glass') as HTMLElement | null
        if (!el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
        el.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
      })
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [])
  return null
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="inline-block animate-spin rounded-full border-2 border-white/25 border-t-white" style={{ width: size, height: size }} aria-hidden="true" />
}

/** Small status pill. */
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'gold' | 'maroon'; children: React.ReactNode }) {
  const t = {
    neutral: 'bg-white/10 text-chrome-2', ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad',
    gold: 'bg-gold/15 text-gold-soft', maroon: 'bg-maroon-hi/25 text-[#ffb3ba]',
  }[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide ${t}`}>{children}</span>
}

/** Fade-up on mount (for client-rendered panels). */
export function useMounted() {
  const [m, setM] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off mount flag
  useEffect(() => setM(true), [])
  return m
}

export function useOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const h = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut() }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [onOut])
  return ref
}
