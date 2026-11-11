'use client'
import { usePublicConfig } from '@/lib/config'
import { SITE } from '@/lib/site'
import { Icon } from './ui'

/** Social buttons. TikTok, Facebook and WhatsApp appear once they're set in the dashboard. */
export function Socials({ compact = false }: { compact?: boolean }) {
  const { socials } = usePublicConfig()
  const items = [
    { href: socials.instagram || SITE.instagram, icon: 'instagram', label: 'Instagram', sub: SITE.instagramHandle },
    socials.tiktok ? { href: socials.tiktok, icon: 'tiktok', label: 'TikTok', sub: 'Behind the scenes' } : null,
    socials.facebook ? { href: socials.facebook, icon: 'facebook', label: 'Facebook', sub: 'Galleries & news' } : null,
    socials.whatsapp ? { href: `https://wa.me/${socials.whatsapp.replace(/\D/g, '')}`, icon: 'whatsapp', label: 'WhatsApp', sub: 'Chat to the team' } : null,
    { href: `mailto:${SITE.email}`, icon: 'mail', label: 'Email', sub: SITE.email },
  ].filter(Boolean) as { href: string; icon: string; label: string; sub: string }[]
  return (
    <div className={`mx-auto grid max-w-3xl gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
      {items.map((s) => (
        <a key={s.label} href={s.href} rel="noopener" className="glass refract group flex items-center gap-4 rounded-[24px] p-4 text-left transition-transform duration-500 hover:-translate-y-0.5">
          <span className="glass glass-maroon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"><Icon name={s.icon} size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{s.label}</span>
            <span className="block truncate text-sm text-chrome-3">{s.sub}</span>
          </span>
          <Icon name="arrow" size={18} className="text-gold-soft transition-transform group-hover:translate-x-1" />
        </a>
      ))}
    </div>
  )
}
