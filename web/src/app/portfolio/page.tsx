import type { Metadata } from 'next'
import Link from 'next/link'
import { PortfolioGrid } from '@/components/media'
import { Icon } from '@/components/ui'

export const metadata: Metadata = { title: 'Portfolio', description: 'Portraits, matric farewells, birthdays, street and editorial work by BANZA Photography.' }

export default function PortfolioPage() {
  return (
    <section className="px-5 pb-10 pt-28 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Portfolio</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-7xl">Moments, <em className="gold-text not-italic">frozen in time.</em></h1>
        <p className="mt-4 max-w-xl text-lg text-chrome-2">A selection of recent work. Tap any photo to see it full screen.</p>
        <div className="mt-10"><PortfolioGrid /></div>
        <div className="glass refract mt-16 flex flex-col items-start justify-between gap-6 rounded-[32px] p-6 sm:flex-row sm:items-center sm:p-10">
          <div><p className="font-serif text-3xl sm:text-4xl">Like what you see?</p><p className="mt-2 text-chrome-2">Your moment could be next.</p></div>
          <Link href="/book/" className="btn btn-primary">Book a shoot <Icon name="arrow" size={18} /></Link>
        </div>
      </div>
    </section>
  )
}
