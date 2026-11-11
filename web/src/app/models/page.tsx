import type { Metadata } from 'next'
import { Photo } from '@/components/media'
import { ModelApply } from '@/components/models'
import { Icon } from '@/components/ui'

export const metadata: Metadata = { title: 'Become a model', description: 'Apply to model with BANZA Photography: fashion, portraits, beauty and brand shoots. Send your details and photos online.' }

const WHAT = [
  { icon: 'sparkle', t: 'All looks welcome', d: 'We cast for personality and presence, not one type.' },
  { icon: 'camera', t: 'Real shoots', d: 'Portraits, fashion and brand work with a professional team.' },
  { icon: 'shield', t: 'Private and safe', d: 'Your photos are seen only by the BANZA team. 18+ only.' },
]

export default function ModelsPage() {
  return (
    <>
      <section className="relative overflow-hidden px-5 pb-10 pt-28 sm:pt-36">
        <div className="absolute inset-0 opacity-50"><Photo id="cap-bw" fill sizes="100vw" priority /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/80 to-ink" />
        <div className="relative mx-auto max-w-3xl">
          <p className="eyebrow">Now casting</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] sm:text-7xl">Become a <em className="gold-text not-italic">BANZA</em> model</h1>
          <p className="mt-5 max-w-xl text-lg text-chrome-2">Tell us about yourself, add a few photos, and if your look fits an upcoming shoot, Mr Banza’s assistant will be in touch.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {WHAT.map((w) => (
              <div key={w.t} className="glass refract rounded-[22px] p-4">
                <Icon name={w.icon} size={20} className="text-gold-soft" />
                <p className="mt-3 font-semibold">{w.t}</p>
                <p className="mt-1 text-sm text-chrome-2">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pt-6"><ModelApply /></section>
    </>
  )
}
