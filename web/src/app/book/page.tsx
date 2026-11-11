import type { Metadata } from 'next'
import { BookingFlow } from '@/components/booking'

export const metadata: Metadata = { title: 'Book a shoot', description: 'Choose your shoot, see open dates on the live calendar and request your booking with BANZA Photography.' }

export default function BookPage() {
  return (
    <section className="relative px-5 pb-10 pt-28 sm:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(110,15,24,0.45),transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl">
        <p className="eyebrow">Book a shoot</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-6xl">Let’s plan your <em className="gold-text not-italic">moment.</em></h1>
        <p className="mt-4 max-w-xl text-lg text-chrome-2">Four quick steps. No payment now: Mr Banza’s assistant confirms every request personally.</p>
      </div>
      <div className="relative mt-10"><BookingFlow /></div>
    </section>
  )
}
