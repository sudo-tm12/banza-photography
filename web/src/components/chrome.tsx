'use client'
// The site frame. Phones: a floating liquid-glass tab bar at the bottom (thumb reach) with a glass
// lens that slides to the active tab, plus a slim top bar. Desktop: a floating glass pill header.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NAV, SITE } from '@/lib/site'
import { useSession } from '@/lib/api'
import { Icon, LogoLink } from './ui'

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href))

export function Header() {
  const path = usePathname()
  const { user } = useSession()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const admin = user?.role === 'admin'
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[max(10px,env(safe-area-inset-top))] sm:px-5">
      <div className={`glass refract pointer-events-auto mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-5 pr-2 transition-all duration-500 ${scrolled ? 'glass-strong' : ''}`}>
        <LogoLink />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.slice(0, 4).map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(path, n.href) ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-[0.92rem] transition-colors ${isActive(path, n.href) ? 'bg-white/14 text-white' : 'text-chrome-2 hover:text-white'}`}>
                  {n.label}
                </Link>
              </li>
            ))}
            {admin ? <li><Link href="/admin/" className={`rounded-full px-4 py-2 text-[0.92rem] ${path.startsWith('/admin') ? 'bg-white/14 text-white' : 'text-gold-soft hover:text-white'}`}>Dashboard</Link></li> : null}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href={admin ? '/admin/' : '/account/'} className="hidden h-10 items-center gap-2 rounded-full px-4 text-[0.9rem] text-chrome-2 hover:text-white md:inline-flex" aria-label={user ? 'Your account' : 'Sign in'}>
            <Icon name="user" size={18} /> {user ? (user.name?.split(' ')[0] || 'Account') : 'Sign in'}
          </Link>
          <Link href="/book/" className="btn btn-primary h-10 min-h-0 px-5 text-[0.9rem]">Book a shoot</Link>
        </div>
      </div>
    </header>
  )
}

export function MobileDock() {
  const path = usePathname()
  const { user } = useSession()
  const items = NAV.map((n) => (n.href === '/account/' && user?.role === 'admin' ? { ...n, href: '/admin/', label: 'Dashboard' } : n))
  const idx = Math.max(0, items.findIndex((n) => isActive(path, n.href)))
  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-safe md:hidden">
      <div className="glass refract glass-strong pointer-events-auto relative mx-auto grid h-[68px] max-w-md grid-cols-5 rounded-[28px] p-1.5">
        {/* the liquid lens: slides under the active tab */}
        <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 rounded-[22px] bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_-6px_rgba(0,0,0,0.6)] transition-[left] duration-500 ease-[cubic-bezier(.2,.9,.25,1.15)]"
          style={{ left: `calc(6px + ${idx} * (100% - 12px) / 5)`, width: 'calc((100% - 12px) / 5)' }} />
        {items.map((n, i) => (
          <Link key={n.href} href={n.href} aria-current={i === idx ? 'page' : undefined}
            className={`relative z-10 flex flex-col items-center justify-center gap-1 rounded-[22px] text-[0.66rem] font-semibold tracking-wide transition-colors ${i === idx ? 'text-white' : 'text-chrome-3'}`}>
            <Icon name={n.icon} size={21} stroke={i === idx ? 2.1 : 1.7} className={n.icon === 'calendar' && i !== idx ? 'text-gold-soft' : ''} />
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/8 pb-36 pt-16 md:pb-14">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-semibold tracking-[0.2em] chrome-text">BANZA</p>
          <p className="mt-1 text-[0.62rem] font-semibold tracking-[0.5em] text-chrome-3">PHOTOGRAPHY</p>
          <p className="mt-6 max-w-sm font-serif text-xl italic text-chrome-2">{SITE.tagline}</p>
          <div className="mt-6 flex gap-2">
            <a href={SITE.instagram} className="glass inline-flex h-11 w-11 items-center justify-center rounded-full" aria-label="Instagram" rel="noopener"><Icon name="instagram" size={19} /></a>
            <a href={`mailto:${SITE.email}`} className="glass inline-flex h-11 w-11 items-center justify-center rounded-full" aria-label="Email"><Icon name="mail" size={19} /></a>
          </div>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <ul className="mt-4 space-y-3 text-chrome-2">
            <li><Link href="/portfolio/" className="hover:text-white">Portfolio</Link></li>
            <li><Link href="/services/" className="hover:text-white">Services & booking info</Link></li>
            <li><Link href="/book/" className="hover:text-white">Book a shoot</Link></li>
            <li><Link href="/models/" className="hover:text-white">Become a model</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Contact</p>
          <ul className="mt-4 space-y-3 text-chrome-2">
            <li><a href={`mailto:${SITE.email}`} className="break-all hover:text-white">{SITE.email}</a></li>
            <li><a href={SITE.instagram} className="hover:text-white" rel="noopener">{SITE.instagramHandle}</a></li>
            <li><Link href="/account/" className="hover:text-white">Your account</Link></li>
            <li className="flex gap-4 text-sm"><Link href="/privacy/" className="hover:text-white">Privacy</Link><Link href="/terms/" className="hover:text-white">Booking terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 px-5 text-xs text-mute sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} BANZA Photography. All rights reserved.</p>
        <p>Photographs © BANZA Photography: please don’t reuse without permission.</p>
      </div>
    </footer>
  )
}
