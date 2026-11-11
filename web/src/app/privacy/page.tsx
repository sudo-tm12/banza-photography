import type { Metadata } from 'next'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Privacy policy', description: 'How BANZA Photography collects, uses and protects your personal information (POPIA).' }

const S = [
  ['Who we are', `BANZA Photography (“we”) is the responsible party for personal information collected on this website. Contact: ${SITE.email}.`],
  ['What we collect', 'When you create an account, book a shoot or apply to model, we collect your name, email address and phone number, the details of your booking or application, and, for model applications, your date of birth, location, optional details such as height and social handle, and the photos you upload.'],
  ['Why we collect it', 'To respond to and manage your booking, to review your model application and contact you about shoots, to send you sign-in codes and updates you asked for, and to keep our records. We never sell your information or use your photos for anything other than reviewing your application without your separate permission.'],
  ['Who can see it', 'Only Mr Banza and his assistant (the BANZA team). Model application photos are stored privately and are only viewable by the team through short-lived secure links. Our service providers (website hosting, database and email delivery) process data on our behalf under appropriate safeguards; some may store data outside South Africa.'],
  ['How long we keep it', 'Bookings are kept for our records for up to 24 months. Model applications are kept while they’re relevant to upcoming shoots; you can ask us to delete yours at any time and we’ll remove your details and photos.'],
  ['Your rights', 'Under the Protection of Personal Information Act (POPIA) you may ask to see, correct or delete your personal information, and object to its processing. Email us and we’ll respond promptly. You may also lodge a complaint with the Information Regulator (inforegulator.org.za).'],
  ['Security', 'Sign-in uses one-time email codes (we never store passwords), sessions expire, and all connections are encrypted.'],
  ['Age', 'Model applications are open to people aged 18 and older only.'],
]

export default function Privacy() {
  return (
    <section className="px-5 pb-10 pt-28 sm:pt-36">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-4 font-serif text-5xl">Privacy policy</h1>
        <p className="mt-3 text-chrome-3">Last updated November 2026</p>
        <div className="glass refract mt-10 space-y-7 rounded-[32px] p-6 sm:p-10">
          {S.map(([t, d]) => <div key={t}><h2 className="font-serif text-2xl">{t}</h2><p className="mt-2 leading-relaxed text-chrome-2">{d}</p></div>)}
        </div>
      </div>
    </section>
  )
}
