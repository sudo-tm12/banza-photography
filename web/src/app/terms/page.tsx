import type { Metadata } from 'next'
import { POLICY, SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Booking terms', description: 'BANZA Photography booking terms: requests, deposits, travel fees and changes.' }

const T = [
  ['Requests and confirmation', 'Booking online sends a request. Your date and time are held for you while we confirm the details and quote with you; the booking is confirmed once we’ve told you so.'],
  ['Deposit', `${POLICY.deposit} The balance is payable on the day of the shoot unless agreed otherwise.`],
  ['Payment', `${POLICY.payment} Use your booking reference when paying by transfer.`],
  ['Travel', 'Travel is free within 5 km; R100 for 5–10 km, R200 for 10–15 km and R300 for 15–20 km. Further distances are quoted.'],
  ['Changes and cancellations', 'You can cancel a pending request from your account at any time. For confirmed shoots, please contact us as early as possible to move or cancel; deposits may be non-refundable for late cancellations.'],
  ['Your photos', 'Photos are delivered as agreed in your quote. BANZA Photography keeps the copyright and may use selected images in its portfolio and on social media; tell us if you’d prefer we didn’t.'],
  ['Contact', `Questions about a booking? Email ${SITE.email}.`],
]

export default function Terms() {
  return (
    <section className="px-5 pb-10 pt-28 sm:pt-36">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Booking terms</p>
        <h1 className="mt-4 font-serif text-5xl">Booking terms</h1>
        <div className="glass refract mt-10 space-y-7 rounded-[32px] p-6 sm:p-10">
          {T.map(([t, d]) => <div key={t}><h2 className="font-serif text-2xl">{t}</h2><p className="mt-2 leading-relaxed text-chrome-2">{d}</p></div>)}
        </div>
      </div>
    </section>
  )
}
