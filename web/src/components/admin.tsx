'use client'
// The BANZA team's dashboard (Mr Banza and the PA): overview, bookings, calendar, model applications, settings.
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, useSession } from '@/lib/api'
import { APP_LABEL, APP_TONE, BOOKING_LABEL, BOOKING_TONE, prettyDate } from './account'
import { AuthPanel } from './auth'
import { shiftMonth, todayISO } from './calendar'
import { Badge, Icon, Spinner } from './ui'

type Slot = { id: string; label: string; time: string }
type Booking = { id: number; ref: string; date: string; slot: string; location: string; distance_band: string; people: number; notes: string; phone: string; status: string; deposit_paid: number; pa_notes: string; created_at: string; shoot: string; client_name: string; client_email: string }
type App = { id: number; ref: string; full_name: string; dob: string; gender: string; height_cm: number | null; city: string; phone: string; social: string; experience: string; interests: string; intro: string; status: string; pa_notes: string; created_at: string; email: string; photo_urls: string[] }

const TABS = [['overview', 'Overview', 'home'], ['bookings', 'Bookings', 'calendar'], ['calendar', 'Calendar', 'grid'], ['models', 'Models', 'star'], ['settings', 'Settings', 'settings']] as const
type Tab = (typeof TABS)[number][0]
const BANDS: Record<string, string> = { 'under-5': 'Under 5 km (free)', '5-10': '5–10 km · R100', '10-15': '10–15 km · R200', '15-20': '15–20 km · R300', 'over-20': '20 km+ · quote' }
const age = (dob: string) => Math.floor((Date.now() - Date.parse(`${dob}T00:00:00Z`)) / (365.25 * 86400_000))

/** South African numbers → wa.me format (071… → 2771…). */
export function waLink(phone: string, text: string) {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('0')) d = `27${d.slice(1)}`
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="glass refract glass-strong max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[30px] sm:p-7" style={{ animation: 'reveal 0.35s var(--ease-glass) both' }}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-start justify-between gap-4"><h2 className="font-serif text-3xl leading-tight">{title}</h2>
          <button onClick={onClose} className="glass inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Close"><Icon name="x" size={18} /></button></div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      {items.map(([v, l]) => <button key={v} onClick={() => onChange(v)} aria-pressed={value === v} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${value === v ? 'bg-white text-black' : 'glass text-chrome-2'}`}>{l}</button>)}
    </div>
  )
}

function ContactButtons({ phone, email, text }: { phone: string; email: string; text: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <a href={waLink(phone, text)} target="_blank" rel="noopener" className="btn h-12 min-h-0 bg-[#25d366] px-3 text-black"><Icon name="whatsapp" size={18} /> WhatsApp</a>
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-glass glass h-12 min-h-0 px-3"><Icon name="clock" size={18} className="hidden" />Call</a>
      <a href={`mailto:${email}`} className="btn btn-glass glass h-12 min-h-0 px-3"><Icon name="mail" size={18} /> Email</a>
    </div>
  )
}

// ── Bookings ──
function BookingSheet({ b, slots, onClose, onSaved }: { b: Booking; slots: Slot[]; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState(b.pa_notes)
  const [notify, setNotify] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const slot = slots.find((s) => s.id === b.slot)
  const first = (b.client_name || '').split(' ')[0] || 'there'
  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label); setErr('')
    try { await api(`/admin/bookings/${b.id}`, { method: 'PATCH', json: body }); onSaved() } catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }
  return (
    <Sheet title={b.shoot} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2"><Badge tone={BOOKING_TONE[b.status] ?? 'neutral'}>{BOOKING_LABEL[b.status]}</Badge>{b.status === 'confirmed' ? <Badge tone={b.deposit_paid ? 'ok' : 'warn'}>{b.deposit_paid ? 'Deposit received' : 'Deposit outstanding'}</Badge> : null}<span className="text-xs text-mute">Ref {b.ref}</span></div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        {[['Client', b.client_name || '—'], ['Date', prettyDate(b.date)], ['Time', slot ? `${slot.label} · ${slot.time}` : b.slot], ['People', String(b.people)], ['Location', b.location], ['Distance', BANDS[b.distance_band] ?? b.distance_band], ['Phone', b.phone], ['Email', b.client_email]].map(([k, v]) => (
          <div key={k} className={k === 'Location' || k === 'Email' ? 'col-span-2 sm:col-span-1' : ''}><dt className="text-xs uppercase tracking-wider text-mute">{k}</dt><dd className="mt-0.5 break-words font-semibold">{v}</dd></div>
        ))}
      </dl>
      {b.notes ? <p className="mt-4 rounded-2xl bg-white/[0.05] p-3 text-sm text-chrome-2">“{b.notes}”</p> : null}
      <div className="mt-5"><ContactButtons phone={b.phone} email={b.client_email} text={`Hi ${first}, this is BANZA Photography about your ${b.shoot.toLowerCase()} request for ${prettyDate(b.date)} (${b.ref}).`} /></div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
        <p className="label">Update status</p>
        <label className="flex items-center gap-2 text-sm text-chrome-2"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#c9a45e]" /> Email the client about this change</label>
        {notify ? <textarea className="field min-h-[80px]" placeholder="Optional message to include (e.g. the quote, what to bring, deposit details)" value={message} onChange={(e) => setMessage(e.target.value)} /> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {b.status !== 'confirmed' ? <button className="btn btn-primary h-12 min-h-0 px-3" disabled={!!busy} onClick={() => patch({ status: 'confirmed', notify, message }, 'c')}>{busy === 'c' ? <Spinner /> : 'Confirm'}</button> : null}
          {b.status === 'confirmed' ? <button className="btn btn-primary h-12 min-h-0 px-3" disabled={!!busy} onClick={() => patch({ status: 'completed', notify, message }, 'd')}>{busy === 'd' ? <Spinner /> : 'Completed'}</button> : null}
          {b.status === 'pending' ? <button className="btn btn-glass glass h-12 min-h-0 px-3" disabled={!!busy} onClick={() => patch({ status: 'declined', notify, message }, 'x')}>{busy === 'x' ? <Spinner /> : 'Decline'}</button> : null}
          {b.status === 'confirmed' ? <button className="btn btn-glass glass h-12 min-h-0 px-3" disabled={!!busy} onClick={() => patch({ deposit_paid: !b.deposit_paid }, 'p')}>{b.deposit_paid ? 'Undo deposit' : 'Deposit received'}</button> : null}
          {b.status === 'pending' || b.status === 'confirmed' ? <button className="btn btn-glass glass h-12 min-h-0 px-3 text-bad" disabled={!!busy} onClick={() => confirm('Cancel this booking?') && patch({ status: 'cancelled', notify, message }, 'k')}>Cancel</button> : null}
          {b.status === 'declined' || b.status === 'cancelled' ? <button className="btn btn-glass glass h-12 min-h-0 px-3" disabled={!!busy} onClick={() => patch({ status: 'pending' }, 'r')}>Reopen</button> : null}
        </div>
      </div>
      <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
        <label className="label" htmlFor="pa-notes">Team notes (private)</label>
        <textarea id="pa-notes" className="field min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote agreed, outfits, special requests…" />
        <button className="btn btn-glass glass h-11 min-h-0" disabled={busy === 'n' || notes === b.pa_notes} onClick={() => patch({ pa_notes: notes }, 'n')}>{busy === 'n' ? <Spinner /> : 'Save notes'}</button>
      </div>
      {err ? <p role="alert" className="mt-4 text-bad">{err}</p> : null}
    </Sheet>
  )
}

function BookingCard({ b, slots, onOpen }: { b: Booking; slots: Slot[]; onOpen: () => void }) {
  const slot = slots.find((s) => s.id === b.slot)
  return (
    <button onClick={onOpen} className="glass refract w-full rounded-[22px] p-4 text-left transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-semibold">{b.client_name || b.client_email}</p><p className="text-sm text-chrome-2">{b.shoot}</p></div>
        <Badge tone={BOOKING_TONE[b.status] ?? 'neutral'}>{BOOKING_LABEL[b.status]?.replace('Awaiting confirmation', 'Pending')}</Badge>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-chrome-3"><span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={15} />{prettyDate(b.date)}</span><span className="inline-flex items-center gap-1.5"><Icon name="clock" size={15} />{slot?.label ?? b.slot}</span><span className="inline-flex items-center gap-1.5"><Icon name="pin" size={15} /><span className="max-w-[12rem] truncate">{b.location}</span></span></p>
    </button>
  )
}

function BookingsTab() {
  const [status, setStatus] = useState<'pending' | 'active' | 'confirmed' | 'completed' | 'declined' | 'cancelled' | ''>('pending')
  const [data, setData] = useState<{ bookings: Booking[]; slots: Slot[] } | null>(null)
  const [open, setOpen] = useState<Booking | null>(null)
  const load = useCallback(() => api<{ bookings: Booking[]; slots: Slot[] }>(`/admin/bookings?status=${status}`).then(setData), [status])
  useEffect(() => { void load() }, [load])
  return (
    <div className="space-y-4">
      <Chips value={status} onChange={setStatus} items={[['pending', 'Pending'], ['confirmed', 'Confirmed'], ['active', 'Upcoming'], ['completed', 'Completed'], ['declined', 'Declined'], ['cancelled', 'Cancelled'], ['', 'All']]} />
      {data === null ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-[22px]" />)}</div>
        : data.bookings.length === 0 ? <p className="glass rounded-[22px] p-6 text-center text-chrome-2">Nothing here right now.</p>
        : <div className="grid gap-3 lg:grid-cols-2">{data.bookings.map((b) => <BookingCard key={b.id} b={b} slots={data.slots} onOpen={() => setOpen(b)} />)}</div>}
      {open && data ? <BookingSheet b={open} slots={data.slots} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); void load() }} /> : null}
    </div>
  )
}

// ── Calendar ──
function CalendarTab() {
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [data, setData] = useState<{ bookings: Booking[]; blocked: { date: string; reason: string }[]; slots: Slot[] } | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [open, setOpen] = useState<Booking | null>(null)
  const [reason, setReason] = useState('')
  const load = useCallback(() => api<{ bookings: Booking[]; blocked: { date: string; reason: string }[]; slots: Slot[] }>(`/admin/calendar?month=${month}`).then(setData), [month])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clear and refetch when the month changes
  useEffect(() => { setData(null); void load() }, [load])
  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number) as [number, number]
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
    return [...Array<null>(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  }, [month])
  const blocked = new Set(data?.blocked.map((b) => b.date))
  const dayBookings = data?.bookings.filter((b) => b.date === day) ?? []
  async function toggleBlock() {
    if (!day) return
    await api('/admin/blocked', { method: 'PUT', json: { date: day, blocked: !blocked.has(day), reason } })
    setReason(''); void load()
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="glass refract rounded-[28px] p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button className="glass inline-flex h-10 w-10 items-center justify-center rounded-full" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevronL" /></button>
          <p className="font-serif text-2xl">{new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
          <button className="glass inline-flex h-10 w-10 items-center justify-center rounded-full" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><Icon name="chevron" /></button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wider text-mute">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />
            const bs = data?.bookings.filter((b) => b.date === iso) ?? []
            const isB = blocked.has(iso)
            return (
              <button key={iso} onClick={() => setDay(iso)} aria-pressed={day === iso}
                className={`relative flex aspect-square flex-col items-center justify-start rounded-xl pt-1.5 text-sm font-semibold transition-all ${day === iso ? 'bg-white text-black' : isB ? 'bg-maroon/40 text-[#ffb3ba]' : 'bg-white/[0.05] hover:bg-white/12'} ${iso === todayISO() ? 'ring-1 ring-gold' : ''}`}>
                {Number(iso.slice(8))}
                <span className="mt-auto mb-1.5 flex gap-0.5">{bs.slice(0, 4).map((b) => <span key={b.id} className={`h-1.5 w-1.5 rounded-full ${b.status === 'confirmed' ? 'bg-ok' : b.status === 'pending' ? 'bg-warn' : 'bg-gold'}`} />)}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-chrome-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" /> Confirmed</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" /> Pending</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-maroon" /> Blocked</span></div>
      </div>
      <div className="glass refract rounded-[28px] p-5">
        {!day ? <p className="text-chrome-2">Tap a day to see its bookings or block it off.</p> : (
          <>
            <p className="font-serif text-2xl">{prettyDate(day)}</p>
            <div className="mt-4 space-y-2">{dayBookings.length ? dayBookings.map((b) => <BookingCard key={b.id} b={b} slots={data?.slots ?? []} onOpen={() => setOpen(b)} />) : <p className="text-sm text-chrome-3">No bookings.</p>}</div>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
              {blocked.has(day) ? <p className="text-sm text-[#ffb3ba]">Blocked{data?.blocked.find((b) => b.date === day)?.reason ? `: ${data.blocked.find((b) => b.date === day)!.reason}` : ''}. Clients can’t book this day.</p>
                : <input className="field" placeholder="Reason (optional, private)" value={reason} onChange={(e) => setReason(e.target.value)} />}
              <button className="btn btn-glass glass h-11 min-h-0 w-full" onClick={toggleBlock}>{blocked.has(day) ? 'Unblock this day' : 'Block this day'}</button>
            </div>
          </>
        )}
      </div>
      {open && data ? <BookingSheet b={open} slots={data.slots} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); void load() }} /> : null}
    </div>
  )
}

// ── Models ──
function AppSheet({ a, onClose, onSaved }: { a: App; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState(a.pa_notes)
  const [notify, setNotify] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [big, setBig] = useState<string | null>(null)
  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label)
    try { await api(`/admin/applications/${a.id}`, { method: 'PATCH', json: body }); onSaved() } catch (e) { alert((e as Error).message) } finally { setBusy('') }
  }
  async function remove() {
    if (!confirm('Permanently delete this application and its photos? (Use this when someone asks for their data to be removed.)')) return
    await api(`/admin/applications/${a.id}`, { method: 'DELETE' }); onSaved()
  }
  const first = a.full_name.split(' ')[0]
  return (
    <Sheet title={a.full_name} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2"><Badge tone={APP_TONE[a.status] ?? 'neutral'}>{APP_LABEL[a.status]}</Badge><span className="text-xs text-mute">Ref {a.ref} · {prettyDate(a.created_at.slice(0, 10))}</span></div>
      <div className="no-scrollbar -mx-5 mt-5 flex snap-x gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {a.photo_urls.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={u} onClick={() => setBig(u)} className="shrink-0 snap-start"><img src={u} alt={`${a.full_name}, photo ${i + 1}`} className="h-56 w-40 rounded-2xl object-cover" loading="lazy" /></button>
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        {[['Age', String(age(a.dob))], ['Based in', a.city], ['Height', a.height_cm ? `${a.height_cm} cm` : '—'], ['Gender', a.gender || '—'], ['Experience', { none: 'New to modelling', some: 'A few shoots', experienced: 'Experienced' }[a.experience] ?? a.experience], ['Interests', a.interests || '—'], ['Phone', a.phone], ['Social', a.social || '—'], ['Email', a.email]].map(([k, v]) => (
          <div key={k} className={k === 'Email' || k === 'Interests' ? 'col-span-2' : ''}><dt className="text-xs uppercase tracking-wider text-mute">{k}</dt><dd className="mt-0.5 break-words font-semibold">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-4 rounded-2xl bg-white/[0.05] p-3 text-sm italic text-chrome-2">“{a.intro}”</p>
      <div className="mt-5"><ContactButtons phone={a.phone} email={a.email} text={`Hi ${first}, this is BANZA Photography. Thank you for your model application (${a.ref})!`} /></div>
      <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
        <p className="label">Move to</p>
        <label className="flex items-center gap-2 text-sm text-chrome-2"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#c9a45e]" /> Email the applicant</label>
        {notify ? <textarea className="field min-h-[80px]" placeholder="Optional message (shoot date, what to bring…)" value={message} onChange={(e) => setMessage(e.target.value)} /> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['contacted', 'shortlisted', 'accepted', 'declined'] as const).filter((s) => s !== a.status).map((s) => (
            <button key={s} className={`btn h-12 min-h-0 px-3 ${s === 'accepted' ? 'btn-primary' : 'btn-glass glass'}`} disabled={!!busy} onClick={() => patch({ status: s, notify, message }, s)}>{busy === s ? <Spinner /> : APP_LABEL[s]}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
        <label className="label" htmlFor="app-notes">Team notes (private)</label>
        <textarea id="app-notes" className="field min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-glass glass h-11 min-h-0" disabled={notes === a.pa_notes || busy === 'n'} onClick={() => patch({ pa_notes: notes }, 'n')}>Save notes</button>
          <button className="btn h-11 min-h-0 text-bad" onClick={remove}><Icon name="trash" size={16} /> Delete data</button>
        </div>
      </div>
      {big ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4" onClick={() => setBig(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      ) : null}
    </Sheet>
  )
}

function ModelsTab() {
  const [status, setStatus] = useState<'new' | 'contacted' | 'shortlisted' | 'accepted' | 'declined' | ''>('new')
  const [apps, setApps] = useState<App[] | null>(null)
  const [open, setOpen] = useState<App | null>(null)
  const load = useCallback(() => api<{ applications: App[] }>(`/admin/applications?status=${status}`).then((r) => setApps(r.applications)), [status])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clear and refetch on filter change
  useEffect(() => { setApps(null); void load() }, [load])
  return (
    <div className="space-y-4">
      <Chips value={status} onChange={setStatus} items={[['new', 'New'], ['contacted', 'Contacted'], ['shortlisted', 'Shortlisted'], ['accepted', 'Selected'], ['declined', 'Declined'], ['', 'All']]} />
      {apps === null ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-[22px]" />)}</div>
        : apps.length === 0 ? <p className="glass rounded-[22px] p-6 text-center text-chrome-2">No applications here.</p>
        : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {apps.map((a) => (
              <button key={a.id} onClick={() => setOpen(a)} className="group relative aspect-[3/4] overflow-hidden rounded-[22px] text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.photo_urls[0] ? <img src={a.photo_urls[0]} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" /> : <div className="absolute inset-0 bg-graphite" />}
                <div className="absolute inset-x-2 bottom-2 glass glass-strong rounded-2xl p-3">
                  <p className="truncate font-semibold">{a.full_name}</p>
                  <p className="text-xs text-chrome-3">{age(a.dob)} · {a.city}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      {open ? <AppSheet a={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); void load() }} /> : null}
    </div>
  )
}

// ── Settings ──
type Type = { id?: number; slug?: string; name: string; description: string; duration: string; price_note: string; active: number }
function SettingsTab() {
  const [s, setS] = useState<Record<string, string> | null>(null)
  const [types, setTypes] = useState<Type[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { api<{ settings: Record<string, string>; shootTypes: Type[] }>('/admin/settings').then((r) => { setS(r.settings); setTypes(r.shootTypes) }).catch((e) => setErr((e as Error).message)) }, [])
  if (!s) return err ? <p className="text-bad">{err}</p> : <div className="skeleton h-64 rounded-[28px]" />
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value })
  async function save() {
    setMsg(''); setErr('')
    try { await api('/admin/settings', { method: 'PUT', json: s }); await api('/admin/shoot-types', { method: 'PUT', json: { types } }); setMsg('Saved. The website updates within a minute.') } catch (e) { setErr((e as Error).message) }
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <div className="space-y-4">
      <section className="glass refract rounded-[28px] p-5 sm:p-6">
        <h3 className="font-serif text-2xl">Shoot types</h3>
        <p className="mt-1 text-sm text-chrome-3">What clients can book. Untick to hide one.</p>
        <div className="mt-4 space-y-3">
          {types.map((t, i) => (
            <div key={t.id ?? `n${i}`} className="grid gap-2 rounded-2xl border border-white/10 p-3 sm:grid-cols-2">
              <input className="field" value={t.name} placeholder="Name" onChange={(e) => setTypes(types.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              <input className="field" value={t.duration} placeholder="Duration, e.g. 1–2 hours" onChange={(e) => setTypes(types.map((x, k) => (k === i ? { ...x, duration: e.target.value } : x)))} />
              <input className="field sm:col-span-2" value={t.description} placeholder="Short description" onChange={(e) => setTypes(types.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} />
              <input className="field" value={t.price_note} placeholder="Price note, e.g. From R500/hour" onChange={(e) => setTypes(types.map((x, k) => (k === i ? { ...x, price_note: e.target.value } : x)))} />
              <label className="flex items-center gap-2 px-1 text-sm text-chrome-2"><input type="checkbox" checked={!!t.active} onChange={(e) => setTypes(types.map((x, k) => (k === i ? { ...x, active: e.target.checked ? 1 : 0 } : x)))} className="h-4 w-4 accent-[#c9a45e]" /> Bookable</label>
            </div>
          ))}
          <button className="btn btn-glass glass h-11 min-h-0" onClick={() => setTypes([...types, { name: '', description: '', duration: '', price_note: 'Quoted on confirmation', active: 1 }])}><Icon name="plus" size={16} /> Add a shoot type</button>
        </div>
      </section>
      <section className="glass refract rounded-[28px] p-5 sm:p-6">
        <h3 className="font-serif text-2xl">Booking rules</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="ld">Minimum notice (days)</label><input id="ld" className="field" type="number" min={0} max={30} value={s.lead_days ?? '2'} onChange={set('lead_days')} /></div>
          <div><label className="label" htmlFor="wd">Bookable up to (days ahead)</label><input id="wd" className="field" type="number" min={7} max={365} value={s.window_days ?? '120'} onChange={set('window_days')} /></div>
        </div>
        <p className="label mt-5">Working days</p>
        <div className="flex flex-wrap gap-2">
          {days.map((d, i) => { const on = (s.working_days ?? '').includes(String(i)); return (
            <button key={d} onClick={() => setS({ ...s, working_days: on ? (s.working_days ?? '').replace(String(i), '') : `${s.working_days ?? ''}${i}` })} aria-pressed={on} className={`rounded-full px-4 py-2.5 text-sm font-semibold ${on ? 'bg-white text-black' : 'glass text-chrome-3'}`}>{d}</button>) })}
        </div>
      </section>
      <section className="glass refract rounded-[28px] p-5 sm:p-6">
        <h3 className="font-serif text-2xl">Socials & contact</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="ig">Instagram link</label><input id="ig" className="field" value={s.instagram ?? ''} onChange={set('instagram')} placeholder="https://www.instagram.com/…" /></div>
          <div><label className="label" htmlFor="tt">TikTok link</label><input id="tt" className="field" value={s.tiktok ?? ''} onChange={set('tiktok')} placeholder="https://www.tiktok.com/@…" /></div>
          <div><label className="label" htmlFor="fb">Facebook link</label><input id="fb" className="field" value={s.facebook ?? ''} onChange={set('facebook')} placeholder="https://www.facebook.com/…" /></div>
          <div><label className="label" htmlFor="wa">WhatsApp number (public)</label><input id="wa" className="field" value={s.whatsapp ?? ''} onChange={set('whatsapp')} placeholder="e.g. 27712345678" /></div>
        </div>
      </section>
      <section className="glass refract rounded-[28px] p-5 sm:p-6">
        <h3 className="font-serif text-2xl">Team</h3>
        <div className="mt-4 grid gap-4">
          <div><label className="label" htmlFor="pa">Alert emails (booking requests and applications)</label><input id="pa" className="field" value={s.pa_emails ?? ''} onChange={set('pa_emails')} /><p className="mt-1 text-xs text-mute">Separate several with commas.</p></div>
          <div><label className="label" htmlFor="ad">Dashboard access (emails)</label><input id="ad" className="field" value={s.admin_emails ?? ''} onChange={set('admin_emails')} /><p className="mt-1 text-xs text-mute">These people sign in with their email code and see this dashboard.</p></div>
        </div>
      </section>
      <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 md:bottom-6">
        <div className="glass glass-strong flex items-center gap-3 rounded-full p-1.5 pl-5">
          <span className="flex-1 truncate text-sm">{err ? <span className="text-bad">{err}</span> : msg ? <span className="text-ok">{msg}</span> : <span className="text-chrome-3">Changes save for the whole site.</span>}</span>
          <button className="btn btn-primary h-11 min-h-0" onClick={save}>Save changes</button>
        </div>
      </div>
    </div>
  )
}

// ── Overview ──
function OverviewTab({ go }: { go: (t: Tab) => void }) {
  const [d, setD] = useState<{ pending: number; upcomingWeek: number; newApplications: number; next: Booking[]; latest: App[] } | null>(null)
  useEffect(() => { api<typeof d>('/admin/summary').then(setD).catch(() => setD(null)) }, [])
  const stats: [string, number | undefined, Tab, string][] = [['Booking requests waiting', d?.pending, 'bookings', 'warn'], ['Confirmed this week', d?.upcomingWeek, 'calendar', 'ok'], ['New model applications', d?.newApplications, 'models', 'gold']]
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(([l, n, t]) => (
          <button key={l} onClick={() => go(t)} className="glass refract rounded-[26px] p-5 text-left transition-transform hover:-translate-y-0.5">
            <p className="font-display text-5xl chrome-text">{n ?? '–'}</p>
            <p className="mt-2 text-sm text-chrome-2">{l}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass refract rounded-[28px] p-5">
          <div className="flex items-center justify-between"><h3 className="font-serif text-2xl">Coming up</h3><button className="text-sm font-semibold text-gold-soft" onClick={() => go('bookings')}>All bookings</button></div>
          <div className="mt-4 space-y-2">{d === null ? <div className="skeleton h-20 rounded-2xl" /> : d.next.length ? d.next.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="min-w-0"><p className="truncate font-semibold">{b.client_name || b.client_email}</p><p className="text-xs text-chrome-3">{b.shoot} · {prettyDate(b.date)}</p></div>
              <Badge tone={BOOKING_TONE[b.status] ?? 'neutral'}>{b.status === 'pending' ? 'Pending' : 'Confirmed'}</Badge>
            </div>)) : <p className="text-sm text-chrome-3">No upcoming shoots yet.</p>}</div>
        </section>
        <section className="glass refract rounded-[28px] p-5">
          <div className="flex items-center justify-between"><h3 className="font-serif text-2xl">Latest applicants</h3><button className="text-sm font-semibold text-gold-soft" onClick={() => go('models')}>All applicants</button></div>
          <div className="mt-4 space-y-2">{d === null ? <div className="skeleton h-20 rounded-2xl" /> : d.latest.length ? d.latest.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="min-w-0"><p className="truncate font-semibold">{a.full_name}</p><p className="text-xs text-chrome-3">{a.city} · {prettyDate(a.created_at.slice(0, 10))}</p></div>
              <Badge tone={APP_TONE[a.status] ?? 'neutral'}>{APP_LABEL[a.status]}</Badge>
            </div>)) : <p className="text-sm text-chrome-3">No applications yet.</p>}</div>
        </section>
      </div>
    </div>
  )
}

export function AdminApp() {
  const { user, ready } = useSession()
  const [tab, setTab] = useState<Tab>('overview')
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the tab from the URL (email links)
    if (t && TABS.some(([k]) => k === t)) setTab(t)
  }, [])
  const go = (t: Tab) => { setTab(t); const u = new URL(window.location.href); u.searchParams.set('tab', t); history.replaceState(null, '', u); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  if (!ready) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!user) return <div className="mx-auto max-w-md"><AuthPanel title="BANZA team sign-in" intro="Use the email address that has dashboard access." askName={false} /></div>
  if (user.role !== 'admin') return <div className="glass mx-auto max-w-md rounded-[28px] p-8 text-center"><p className="font-serif text-3xl">Team only</p><p className="mt-3 text-chrome-2">This dashboard is for the BANZA team. <Link href="/account/" className="text-gold-soft underline">Go to your account</Link>.</p></div>
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Dashboard</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{TABS.find(([k]) => k === tab)?.[1]}</h1></div>
        <Link href="/" className="text-sm text-chrome-3 hover:text-white">View the website</Link>
      </div>
      <div className="no-scrollbar glass sticky top-[calc(72px+env(safe-area-inset-top))] z-40 -mx-1 mt-5 flex gap-1 overflow-x-auto rounded-full p-1.5" role="tablist">
        {TABS.map(([k, l, icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${tab === k ? 'bg-white text-black' : 'text-chrome-2'}`}><Icon name={icon} size={16} />{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'overview' ? <OverviewTab go={go} /> : tab === 'bookings' ? <BookingsTab /> : tab === 'calendar' ? <CalendarTab /> : tab === 'models' ? <ModelsTab /> : <SettingsTab />}
      </div>
    </div>
  )
}
