'use client'
// Photos and galleries: responsive WebP, the hero slideshow, the portfolio grid and a swipeable lightbox.
import { useCallback, useEffect, useRef, useState } from 'react'
import gallery from '@/lib/gallery.json'
import { asset } from '@/lib/site'
import { Icon } from './ui'

export type Shot = { id: string; category: string; alt: string; focus: string; w: number; h: number }
export const GALLERY = gallery as Shot[]
export const shot = (id: string) => GALLERY.find((g) => g.id === id)!
export const src = (id: string, w: 640 | 1280) => asset(`/img/work/${id}-${w}.webp`)

export function Photo({ id, className = '', sizes = '(min-width: 1024px) 33vw, 100vw', priority = false, fill = false, style }: { id: string; className?: string; sizes?: string; priority?: boolean; fill?: boolean; style?: React.CSSProperties }) {
  const s = shot(id)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src(id, 1280)} srcSet={`${src(id, 640)} 640w, ${src(id, 1280)} 1280w`} sizes={sizes} alt={s.alt} width={s.w} height={s.h}
      loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : undefined} draggable={false}
      className={`${fill ? 'absolute inset-0 h-full w-full object-cover' : 'h-auto w-full'} ${className}`} style={{ objectPosition: s.focus, ...style }} />
  )
}

/** Crossfading, slowly zooming hero images. */
export function HeroSlides({ ids, interval = 5200 }: { ids: string[]; interval?: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((v) => (v + 1) % ids.length), interval)
    return () => clearInterval(t)
  }, [ids.length, interval])
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden="true">
      {ids.map((id, k) => (
        <div key={id} className="absolute inset-0 transition-opacity duration-[1600ms] ease-out" style={{ opacity: k === i ? 1 : 0 }}>
          <Photo id={id} fill priority={k === 0} sizes="100vw" style={{ animation: k === i ? `kenburns ${interval + 1600}ms ease-out both` : undefined }} />
        </div>
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,transparent_30%,rgba(8,8,10,0.55)_70%,#08080a_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      <div className="absolute bottom-[calc(118px+env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 gap-1.5 md:bottom-8">
        {ids.map((id, k) => <span key={id} className={`h-1 rounded-full transition-all duration-700 ${k === i ? 'w-8 bg-white' : 'w-2 bg-white/35'}`} />)}
      </div>
    </div>
  )
}

/** Swipeable, keyboard-friendly full-screen viewer. */
export function Lightbox({ ids, index, onClose, onIndex }: { ids: string[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const start = useRef<number | null>(null)
  const go = useCallback((d: number) => onIndex((index + d + ids.length) % ids.length), [index, ids.length, onIndex])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [go, onClose])
  const id = ids[index]!
  const s = shot(id)
  return (
    <div role="dialog" aria-modal="true" aria-label={s.alt} className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur-xl"
      onPointerDown={(e) => { start.current = e.clientX }} onPointerUp={(e) => { if (start.current !== null && Math.abs(e.clientX - start.current) > 50) go(e.clientX < start.current ? 1 : -1); start.current = null }}>
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <span className="text-sm text-chrome-3">{index + 1} / {ids.length} · {s.category}</span>
        <button onClick={onClose} className="glass inline-flex h-11 w-11 items-center justify-center rounded-full" aria-label="Close"><Icon name="x" size={20} /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={id} src={src(id, 1280)} alt={s.alt} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" style={{ animation: 'reveal 0.4s ease-out both' }} draggable={false} />
        <button onClick={() => go(-1)} className="glass absolute left-3 hidden h-12 w-12 items-center justify-center rounded-full sm:inline-flex" aria-label="Previous"><Icon name="chevronL" /></button>
        <button onClick={() => go(1)} className="glass absolute right-3 hidden h-12 w-12 items-center justify-center rounded-full sm:inline-flex" aria-label="Next"><Icon name="chevron" /></button>
      </div>
      <p className="px-6 pb-[max(20px,env(safe-area-inset-bottom))] text-center text-sm text-chrome-3">{s.alt}</p>
    </div>
  )
}

/** The portfolio: filter chips + masonry; tap any photo to open the lightbox. */
export function PortfolioGrid({ limit }: { limit?: number }) {
  const cats = ['All', ...Array.from(new Set(GALLERY.map((g) => g.category)))]
  const [cat, setCat] = useState('All')
  const [open, setOpen] = useState<number | null>(null)
  const list = GALLERY.filter((g) => cat === 'All' || g.category === cat).slice(0, limit)
  const ids = list.map((g) => g.id)
  return (
    <div>
      {!limit ? (
        <div className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="Filter the portfolio">
          {cats.map((c) => (
            <button key={c} role="tab" aria-selected={c === cat} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${c === cat ? 'bg-white text-black' : 'glass text-chrome-2'}`}>{c}</button>
          ))}
        </div>
      ) : null}
      <div className="columns-2 gap-3 sm:gap-4 lg:columns-3">
        {list.map((g, i) => (
          <button key={g.id} onClick={() => setOpen(i)} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl sm:mb-4 sm:rounded-3xl" aria-label={`Open: ${g.alt}`}>
            <Photo id={g.id} className="transition-transform duration-700 group-hover:scale-[1.04]" sizes="(min-width: 1024px) 33vw, 50vw" />
            <span className="glass absolute bottom-2 left-2 rounded-full px-3 py-1 text-[0.68rem] font-semibold tracking-wide opacity-0 transition-opacity group-hover:opacity-100">{g.category}</span>
          </button>
        ))}
      </div>
      {open !== null ? <Lightbox ids={ids} index={open} onClose={() => setOpen(null)} onIndex={setOpen} /> : null}
    </div>
  )
}
