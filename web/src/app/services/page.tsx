import type { Metadata } from 'next'
import Link from 'next/link'
import { Photo } from '@/components/media'
import { Icon } from '@/components/ui'
import { POLICY, rand } from '@/lib/site'

export const metadata: Metadata = { title: 'Services & booking info', description: 'Portrait shoots, birthday parties, events and graduations by BANZA Photography. Travel fees, deposit and payment details.' }

const SERVICES = [
  { id: 'blazer-portrait', t: 'Portrait shoots', d: 'Personal, professional and creative portraits: headshots, couples and fashion looks. Styled around you, in studio-style light or out on location.', type: 'portrait' },
  { id: 'birthday-laugh', t: 'Birthday parties', d: 'From the décor and the cake to the laughter and the speeches: every part of your celebration, captured as it happens.', type: 'birthday' },
  { id: 'lilac-gown', t: 'Events', d: 'Matric farewells, functions and gatherings. Arrivals, details, the people and the atmosphere, covered end to end.', type: 'event' },
  { id: 'emerald-gown', t: 'Graduations', d: 'Graduation portraits and ceremonies for schools, crèches and families. Graduation caps and gowns can be arranged.', type: 'graduation' },
]

export default function ServicesPage() {
  return (
    <section className="px-5 pb-10 pt-28 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Our services</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-7xl">More than <em className="gold-text not-italic">just photos.</em></h1>
        <div className="mt-12 space-y-4">
          {SERVICES.map((s, i) => (
            <article key={s.t} className="glass refract reveal grid overflow-hidden rounded-[32px] md:grid-cols-2">
              <div className={`relative aspect-[4/3] md:aspect-auto md:min-h-[380px] ${i % 2 ? 'md:order-2' : ''}`}><Photo id={s.id} fill sizes="(min-width:768px) 50vw, 100vw" /></div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <span className="font-display text-sm gold-text">0{i + 1}</span>
                <h2 className="mt-2 font-serif text-4xl">{s.t}</h2>
                <p className="mt-4 leading-relaxed text-chrome-2">{s.d}</p>
                <Link href={`/book/?type=${s.type}`} className="btn btn-primary mt-7 self-start">Book {s.t.toLowerCase()} <Icon name="arrow" size={18} /></Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 grid gap-4 lg:grid-cols-2">
          <section className="glass refract rounded-[32px] p-6 sm:p-8" aria-labelledby="travel">
            <div className="flex items-center gap-3"><span className="glass glass-maroon inline-flex h-11 w-11 items-center justify-center rounded-2xl"><Icon name="car" size={20} /></span><h2 id="travel" className="font-serif text-3xl">Travel fees</h2></div>
            <p className="mt-2 text-chrome-3">Your location, your travel fee.</p>
            <table className="mt-6 w-full text-left">
              <thead><tr className="text-xs uppercase tracking-wider text-mute"><th className="pb-3 font-semibold">Distance</th><th className="pb-3 text-right font-semibold">Travel fee</th></tr></thead>
              <tbody>
                {POLICY.travel.map((t) => (
                  <tr key={t.band} className={`border-t border-white/10 ${t.fee === 0 ? 'text-white' : ''}`}>
                    <td className={`py-4 ${t.fee === 0 ? 'font-semibold' : 'text-chrome-2'}`}>{t.label}</td>
                    <td className={`py-4 text-right font-semibold ${t.fee === 0 ? 'text-ok' : ''}`}>{t.fee === null ? 'Quoted' : t.fee === 0 ? 'FREE' : rand(t.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="glass refract rounded-[32px] p-6 sm:p-8" aria-labelledby="booking">
            <div className="flex items-center gap-3"><span className="glass glass-gold inline-flex h-11 w-11 items-center justify-center rounded-2xl"><Icon name="card" size={20} /></span><h2 id="booking" className="font-serif text-3xl">Booking information</h2></div>
            <p className="mt-6 font-display text-7xl leading-none chrome-text">50%</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-gold-soft">Deposit required</p>
            <p className="mt-4 leading-relaxed text-chrome-2">{POLICY.deposit} Your date is held as a request until we’ve confirmed it with you.</p>
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="label">Payment methods</p>
              <p className="flex items-center gap-2 text-chrome-2"><Icon name="card" size={18} /> {POLICY.payment}</p>
            </div>
            <Link href="/book/" className="btn btn-maroon mt-7 w-full">Check available dates</Link>
          </section>
        </div>
      </div>
    </section>
  )
}
