'use client'
// Book a shoot: 1 shoot type → 2 date and time (live calendar) → 3 details → 4 review, sign in, send.
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { api, useSession } from '@/lib/api'
import { usePublicConfig } from '@/lib/config'
import { POLICY, rand } from '@/lib/site'
import { AuthPanel } from './auth'
import { Calendar, type DayState } from './calendar'
import { Icon, Spinner } from './ui'

type Draft = { type: string; date: string | null; slot: string; location: string; band: string; people: number; phone: string; notes: string }
const EMPTY: Draft = { type: '', date: null, slot: '', location: '', band: '', people: 1, phone: '', notes: '' }
const STEPS = ['Shoot', 'Date', 'Details', 'Review']
const KEY = 'banza.bookingDraft'
const pretty = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function BookingFlow() {
  const cfg = usePublicConfig()
  const { user, ready } = useSession()
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(EMPTY)
  const [day, setDay] = useState<DayState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<string | null>(null)

  // Restore a draft (and ?type= from service links).
  useEffect(() => {
    let draft = EMPTY
    try { draft = { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') } } catch { /* ignore */ }
    const t = new URLSearchParams(window.location.search).get('type')
    if (t) draft = { ...draft, type: t }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring saved progress on mount
    setD(draft)
    if (t) setStep(1)
  }, [])
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)) } catch { /* ignore */ } }, [d])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill the phone from the account once it loads
  useEffect(() => { if (user?.phone && !d.phone) setD((x) => ({ ...x, phone: user.phone })) }, [user, d.phone])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  const type = cfg.shootTypes.find((t) => t.slug === d.type)
  const band = POLICY.travel.find((b) => b.band === d.band)
  const slot = cfg.slots.find((s) => s.id === d.slot)
  const canNext = [!!type, !!d.date && !!d.slot, d.location.trim().length >= 3 && !!band && /^\+?[0-9 ()-]{9,20}$/.test(d.phone), true][step]
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const r = await api<{ ref: string }>('/bookings', { method: 'POST', json: { shootType: d.type, date: d.date, slot: d.slot, location: d.location, distanceBand: d.band, people: d.people, phone: d.phone, notes: d.notes, name: user?.name } })
      setDone(r.ref)
      try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
    } catch (e) {
      setErr((e as Error).message)
      if (/taken|available/.test((e as Error).message)) { set({ slot: '' }); setStep(1) }
    } finally { setBusy(false) }
  }

  if (done) return (
    <div className="glass refract glass-strong mx-auto max-w-xl rounded-[32px] p-8 text-center reveal">
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok"><Icon name="check" size={32} stroke={2.4} /></span>
      <h2 className="mt-6 font-serif text-4xl">Request sent</h2>
      <p className="mt-3 text-chrome-2">Your reference is <b className="text-white">{done}</b>. Mr Banza’s assistant will contact you shortly to confirm the details and the quote. We’ve emailed you a copy.</p>
      <p className="mt-4 text-sm text-chrome-3">{POLICY.deposit}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/account/" className="btn btn-primary">View my bookings</Link>
        <Link href="/portfolio/" className="btn btn-glass glass">Browse the portfolio</Link>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      {/* progress */}
      <ol className="glass mb-6 grid grid-cols-4 gap-1 rounded-full p-1.5" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => i < step && setStep(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}
              className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[0.8rem] font-semibold transition-all ${i === step ? 'bg-white text-black' : i < step ? 'text-white' : 'text-mute'}`}>
              {i < step ? <Icon name="check" size={14} stroke={2.6} /> : <span className="hidden sm:inline">{i + 1}.</span>}{s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section aria-labelledby="s1">
          <h2 id="s1" className="font-serif text-3xl sm:text-4xl">What are we shooting?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {cfg.shootTypes.map((t) => (
              <button key={t.slug} onClick={() => { set({ type: t.slug }); setStep(1) }} aria-pressed={d.type === t.slug}
                className={`glass refract rounded-[24px] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${d.type === t.slug ? 'glass-gold ring-1 ring-gold/60' : ''}`}>
                <span className="block font-serif text-2xl">{t.name}</span>
                <span className="mt-1.5 block text-[0.95rem] text-chrome-2">{t.description}</span>
                <span className="mt-4 flex flex-wrap gap-2 text-xs text-chrome-3"><span className="inline-flex items-center gap-1"><Icon name="clock" size={14} />{t.duration}</span><span>· {t.price_note}</span></span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby="s2">
          <h2 id="s2" className="font-serif text-3xl sm:text-4xl">Pick your date</h2>
          <p className="mt-2 text-chrome-2">{type?.name}. Choose an available day, then a time.</p>
          <div className="mt-6"><Calendar value={d.date} onPick={(date, st) => { set({ date, slot: st.free.includes(d.slot) ? d.slot : '' }); setDay(st) }} maxMonths={Math.max(1, Math.ceil(cfg.windowDays / 30))} /></div>
          {d.date ? (
            <div className="mt-6 reveal">
              <p className="label">{pretty(d.date)}: choose a time</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cfg.slots.map((s) => {
                  const free = day ? day.free.includes(s.id) : true
                  return (
                    <button key={s.id} disabled={!free} onClick={() => set({ slot: s.id })} aria-pressed={d.slot === s.id}
                      className={`rounded-2xl border p-3.5 text-left transition-all ${d.slot === s.id ? 'border-white bg-white text-black' : free ? 'glass border-white/10' : 'border-white/5 text-white/25 line-through'}`}>
                      <span className="block font-semibold">{s.label}</span><span className="block text-xs opacity-70">{s.time}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="s3" className="space-y-5">
          <h2 id="s3" className="font-serif text-3xl sm:text-4xl">The details</h2>
          <div><label className="label" htmlFor="loc">Where is the shoot?</label>
            <input id="loc" className="field" value={d.location} onChange={(e) => set({ location: e.target.value })} placeholder="Suburb, venue or address" autoComplete="street-address" /></div>
          <div>
            <p className="label">How far is it from us?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {POLICY.travel.map((t) => (
                <button key={t.band} onClick={() => set({ band: t.band })} aria-pressed={d.band === t.band}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${d.band === t.band ? 'border-white bg-white text-black' : 'glass border-white/10'}`}>
                  <span className="font-semibold">{t.label}</span>
                  <span className={`text-sm font-semibold ${d.band === t.band ? '' : t.fee === 0 ? 'text-ok' : 'text-gold-soft'}`}>{t.fee === null ? 'Quoted' : t.fee === 0 ? 'Free' : rand(t.fee)}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-mute">Travel fee: your location, your travel fee. Not sure? Pick your best guess; we’ll confirm.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label" htmlFor="ppl">How many people?</label>
              <input id="ppl" className="field" type="number" inputMode="numeric" min={1} max={500} value={d.people} onChange={(e) => set({ people: Math.max(1, Number(e.target.value) || 1) })} /></div>
            <div><label className="label" htmlFor="ph">WhatsApp / phone</label>
              <input id="ph" className="field" type="tel" inputMode="tel" autoComplete="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="e.g. 071 234 5678" /></div>
          </div>
          <div><label className="label" htmlFor="nt">Anything we should know? <span className="normal-case tracking-normal text-mute">(optional)</span></label>
            <textarea id="nt" className="field" value={d.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={1000} placeholder="The occasion, the look you’re going for, outfits, ideas…" /></div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="s4" className="space-y-5">
          <h2 id="s4" className="font-serif text-3xl sm:text-4xl">Review & send</h2>
          <div className="glass refract rounded-[28px] p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[['Shoot', type?.name], ['Date', d.date ? pretty(d.date) : ''], ['Time', slot ? `${slot.label} (${slot.time})` : ''], ['Location', d.location], ['Travel', band ? `${band.label} · ${band.fee === null ? 'quoted' : band.fee === 0 ? 'free' : rand(band.fee)}` : ''], ['People', String(d.people)], ['Phone', d.phone]].map(([k, v]) => (
                <div key={k}><dt className="text-xs uppercase tracking-wider text-mute">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
              ))}
            </dl>
            {d.notes ? <p className="mt-4 border-t border-white/10 pt-4 text-chrome-2">“{d.notes}”</p> : null}
          </div>
          <div className="glass glass-maroon flex gap-3 rounded-[22px] p-4 text-sm">
            <Icon name="card" size={20} className="mt-0.5 shrink-0 text-gold-soft" />
            <p className="text-chrome-2"><b className="text-white">Nothing to pay now.</b> We’ll confirm your quote first. {POLICY.deposit} {POLICY.payment}</p>
          </div>
          {!ready ? <div className="flex justify-center py-6"><Spinner /></div> : user ? (
            <>
              <p className="text-sm text-chrome-3">Booking as <b className="text-white">{user.name || user.email}</b> ({user.email})</p>
              {err ? <p role="alert" className="text-bad">{err}</p> : null}
              <button className="btn btn-maroon w-full" onClick={submit} disabled={busy}>{busy ? <Spinner /> : <>Send booking request <Icon name="arrow" size={18} /></>}</button>
              <p className="text-center text-xs text-mute">By sending, you agree to our <Link href="/terms/" className="underline">booking terms</Link>.</p>
            </>
          ) : <AuthPanel title="Sign in to send your request" intro="So we can confirm your booking and keep you updated." />}
        </section>
      ) : null}

      {/* sticky actions (thumb reach on phones) */}
      {step > 0 && step < 3 ? (
        <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 mt-8 md:bottom-6">
          <div className="glass glass-strong flex gap-2 rounded-full p-1.5">
            <button className="btn btn-glass h-12 min-h-0 flex-none px-5" onClick={() => setStep(step - 1)} aria-label="Back"><Icon name="back" size={18} /></button>
            <button className="btn btn-primary h-12 min-h-0 flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" size={18} /></button>
          </div>
        </div>
      ) : step === 3 ? (
        <button className="mt-6 inline-flex items-center gap-2 text-chrome-3 hover:text-white" onClick={() => setStep(2)}><Icon name="back" size={16} /> Edit details</button>
      ) : null}
    </div>
  )
}

export function useSlotsLabel() { const cfg = usePublicConfig(); return useMemo(() => Object.fromEntries(cfg.slots.map((s) => [s.id, `${s.label} (${s.time})`])), [cfg.slots]) }
