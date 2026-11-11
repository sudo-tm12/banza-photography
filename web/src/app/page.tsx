import Link from 'next/link'
import { HeroSlides, Photo, PortfolioGrid } from '@/components/media'
import { Socials } from '@/components/socials'
import { Icon, Wordmark } from '@/components/ui'
import { asset, POLICY, SITE } from '@/lib/site'

const SERVICES = [
  { icon: 'user', t: 'Portrait shoots', d: 'Personal, professional and creative portraits, styled around you.', type: 'portrait' },
  { icon: 'gift', t: 'Birthday parties', d: 'The candles, the laughter and the moments in between.', type: 'birthday' },
  { icon: 'users', t: 'Events', d: 'Matric farewells, celebrations and gatherings, covered end to end.', type: 'event' },
  { icon: 'cap', t: 'Graduations', d: 'Caps, gowns and proud families, ready to frame.', type: 'graduation' },
]

const STEPS = [
  { t: 'Choose your shoot', d: 'Portrait, birthday, event or graduation.' },
  { t: 'Pick a date', d: 'See open days on the live calendar and request yours.' },
  { t: 'We confirm', d: 'Mr Banza’s assistant contacts you to confirm the details.' },
  { t: 'Secure it', d: POLICY.deposit },
]

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden pb-[calc(110px+env(safe-area-inset-bottom))] md:items-center md:pb-0">
        <HeroSlides ids={['emerald-gown', 'cap-bw', 'lilac-gown', 'birthday-laugh', 'curbside-bw']} />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-5">
          <div className="glass refract glass-strong mx-auto max-w-xl rounded-[30px] px-5 pb-5 pt-6 text-center sm:px-10 sm:pb-7 sm:pt-8 md:mx-0 md:text-left">
            <p className="eyebrow">Mr Banza · Photographer</p>
            <h1 className="mt-3 sm:mt-5"><span className="sr-only">BANZA Photography</span><Wordmark priority className="mx-auto -my-3 w-[min(78%,360px)] md:mx-0 md:-ml-4" /></h1>
            <p className="mt-3 font-serif text-[1.5rem] leading-tight text-chrome sm:text-3xl">{SITE.tagline}</p>
            <p className="mt-2 hidden text-[0.98rem] leading-relaxed text-chrome-2 sm:block">{SITE.promise}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:gap-3">
              <Link href="/book/" className="btn btn-primary flex-1 px-3">Book a shoot</Link>
              <Link href="/models/" className="btn btn-glass glass flex-1 px-3">Be a model</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── The photographer (no portrait: the work and the mark speak for him) ── */}
      <section className="relative mx-auto max-w-6xl px-5 pt-24 sm:pt-32">
        <div className="grid items-center gap-14 md:grid-cols-[1fr_1.15fr]">
          <div className="reveal relative mx-auto aspect-square w-full max-w-[420px]">
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(158,27,40,0.55),transparent_68%)] blur-2xl" />
            <div className="glass refract absolute inset-[6%] flex items-center justify-center rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset('/img/brand/monogram-alpha.webp')} alt="The BANZA Photography monogram" width={1000} height={1000} className="w-[88%]" loading="lazy" style={{ animation: 'floaty 7s ease-in-out infinite' }} />
            </div>
          </div>
          <div className="reveal">
            <p className="eyebrow">Meet the photographer</p>
            <h2 className="mt-5 font-serif text-[2.4rem] leading-[1.05] sm:text-6xl">We capture special moments and <em className="gold-text not-italic">freeze them in time.</em></h2>
            <p className="mt-6 text-lg leading-relaxed text-chrome-2">BANZA Photography is the studio of Mr Banza: portraits with character, celebrations with heart, and events covered with an eye for the moments people remember. Every shoot is planned around you, from the first message to the final gallery.</p>
            <p className="mt-6 font-script text-4xl text-gold-soft">{SITE.more}</p>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="mx-auto max-w-6xl px-5 pt-28">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Our services</p>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">What we shoot</h2>
          </div>
          <Link href="/services/" className="hidden items-center gap-2 text-gold-soft hover:text-white sm:inline-flex">Booking info <Icon name="arrow" size={18} /></Link>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link key={s.t} href={`/book/?type=${s.type}`} className="glass refract reveal group flex flex-col rounded-[28px] p-6 transition-transform duration-500 hover:-translate-y-1">
              <span className="glass-maroon glass inline-flex h-12 w-12 items-center justify-center rounded-2xl"><Icon name={s.icon} size={22} /></span>
              <span className="mt-6 font-serif text-2xl">{s.t}</span>
              <span className="mt-2 text-[0.95rem] leading-relaxed text-chrome-2">{s.d}</span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-soft">Book this <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Portfolio teaser ── */}
      <section className="mx-auto max-w-6xl px-5 pt-28">
        <p className="eyebrow">Portfolio</p>
        <div className="mt-4 flex items-end justify-between gap-6">
          <h2 className="font-serif text-4xl sm:text-5xl">Recent work</h2>
          <Link href="/portfolio/" className="inline-flex items-center gap-2 text-gold-soft hover:text-white">See all <Icon name="arrow" size={18} /></Link>
        </div>
        <div className="mt-10"><PortfolioGrid limit={9} /></div>
      </section>

      {/* ── How booking works ── */}
      <section className="mx-auto max-w-6xl px-5 pt-28">
        <div className="glass refract rounded-[36px] p-6 sm:p-12">
          <p className="eyebrow">How booking works</p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Four easy steps</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="relative">
                <span className="font-display text-4xl gold-text">0{i + 1}</span>
                <p className="mt-3 text-lg font-semibold">{s.t}</p>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-chrome-2">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/book/" className="btn btn-primary">Check available dates <Icon name="calendar" size={18} /></Link>
            <Link href="/services/" className="btn btn-glass glass">Travel fees & payment</Link>
          </div>
        </div>
      </section>

      {/* ── Models ── */}
      <section className="mx-auto max-w-6xl px-5 pt-28">
        <div className="relative overflow-hidden rounded-[36px]">
          <div className="absolute inset-0"><Photo id="beanie-smile" fill sizes="(min-width:1024px) 1100px, 100vw" /></div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10 md:bg-gradient-to-r md:from-ink md:via-ink/70 md:to-transparent" />
          <div className="relative flex min-h-[560px] items-end p-4 sm:p-8 md:items-center">
            <div className="glass refract glass-strong max-w-md rounded-[28px] p-6 sm:p-8">
              <p className="eyebrow">Now casting</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight">Become a BANZA model</h2>
              <p className="mt-4 leading-relaxed text-chrome-2">Fresh faces for portraits, fashion and brand shoots. Tell us about yourself, add a few photos, and our team will be in touch.</p>
              <Link href="/models/" className="btn btn-maroon mt-7 w-full sm:w-auto">Apply now <Icon name="arrow" size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Follow ── */}
      <section className="mx-auto max-w-6xl px-5 pt-28 text-center">
        <p className="eyebrow">Follow the work</p>
        <h2 className="mt-4 font-serif text-4xl sm:text-5xl">New shoots, first on socials</h2>
        <div className="mt-8"><Socials /></div>
        <p className="mt-16 font-script text-5xl leading-tight text-gold-soft sm:text-6xl">Let’s create beautiful memories together</p>
        <Link href="/book/" className="btn btn-primary mt-8">Book your shoot <Icon name="arrow" size={18} /></Link>
      </section>
    </>
  )
}
