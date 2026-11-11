'use client'
// The client portal: bookings and model applications with live status, profile, sign out.
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { api, useSession } from '@/lib/api'
import { AuthPanel } from './auth'
import { Badge, Icon, Spinner } from './ui'

type Booking = { ref: string; shoot: string; date: string; slot: string; location: string; status: string; deposit_paid: number; created_at: string }
type App = { ref: string; full_name: string; city: string; status: string; created_at: string }
type Slot = { id: string; label: string; time: string }

export const BOOKING_TONE: Record<string, 'warn' | 'ok' | 'gold' | 'bad' | 'neutral'> = { pending: 'warn', confirmed: 'ok', completed: 'gold', declined: 'bad', cancelled: 'neutral' }
export const BOOKING_LABEL: Record<string, string> = { pending: 'Awaiting confirmation', confirmed: 'Confirmed', completed: 'Completed', declined: 'Declined', cancelled: 'Cancelled' }
export const APP_TONE: Record<string, 'warn' | 'ok' | 'gold' | 'bad' | 'neutral' | 'maroon'> = { new: 'warn', contacted: 'gold', shortlisted: 'maroon', accepted: 'ok', declined: 'neutral' }
export const APP_LABEL: Record<string, string> = { new: 'Received', contacted: 'We’ve been in touch', shortlisted: 'Shortlisted', accepted: 'Selected', declined: 'Not this time' }
export const prettyDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function Account() {
  const { user, ready, signOut, reload } = useSession()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [apps, setApps] = useState<App[] | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [saved, setSaved] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [b, a] = await Promise.all([api<{ bookings: Booking[]; slots: Slot[] }>('/bookings/mine'), api<{ applications: App[] }>('/applications/mine')])
    setBookings(b.bookings); setSlots(b.slots); setApps(a.applications)
  }, [])
  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the session
    setProfile({ name: user.name, phone: user.phone })
    load().catch((e) => setErr((e as Error).message))
  }, [user, load])

  if (!ready) return <div className="flex justify-center py-20"><Spinner size={28} /></div>
  if (!user) return <div className="mx-auto max-w-md"><AuthPanel title="Your BANZA account" intro="Sign in to see your bookings and applications. New here? Same steps." /></div>

  const slotLabel = (id: string) => { const s = slots.find((x) => x.id === id); return s ? `${s.label}, ${s.time}` : id }
  async function cancel(ref: string) {
    if (!confirm('Cancel this booking request?')) return
    try { await api(`/bookings/${ref}/cancel`, { method: 'POST' }); await load() } catch (e) { alert((e as Error).message) }
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaved(''); setErr('')
    try { await api('/me', { method: 'PATCH', json: profile }); await reload(); setSaved('Saved') } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-3 font-serif text-5xl">Hi{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-chrome-3">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' ? <Link href="/admin/" className="btn btn-primary h-11 min-h-0">Open dashboard</Link> : null}
          <button className="btn btn-glass glass h-11 min-h-0" onClick={signOut}><Icon name="logout" size={18} /> Sign out</button>
        </div>
      </div>
      {err ? <p className="text-bad">{err}</p> : null}

      <section className="glass refract rounded-[28px] p-6">
        <div className="flex items-center justify-between"><h2 className="font-serif text-3xl">Your bookings</h2><Link href="/book/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-soft"><Icon name="plus" size={16} /> New booking</Link></div>
        <div className="mt-5 space-y-3">
          {bookings === null ? <div className="skeleton h-24 rounded-2xl" /> : bookings.length === 0 ? (
            <p className="text-chrome-2">No bookings yet. <Link href="/book/" className="text-gold-soft underline">Book your first shoot</Link>.</p>
          ) : bookings.map((b) => (
            <div key={b.ref} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-lg font-semibold">{b.shoot}</p><p className="text-sm text-chrome-2">{prettyDate(b.date)} · {slotLabel(b.slot)}</p></div>
                <Badge tone={BOOKING_TONE[b.status] ?? 'neutral'}>{BOOKING_LABEL[b.status] ?? b.status}</Badge>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-chrome-3"><Icon name="pin" size={15} /> {b.location}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
                <span>Ref {b.ref}{b.status === 'confirmed' ? ` · Deposit ${b.deposit_paid ? 'received' : 'due to secure'}` : ''}</span>
                {b.status === 'pending' ? <button className="font-semibold text-bad" onClick={() => cancel(b.ref)}>Cancel request</button> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass refract rounded-[28px] p-6">
        <div className="flex items-center justify-between"><h2 className="font-serif text-3xl">Model applications</h2><Link href="/models/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-soft"><Icon name="plus" size={16} /> Apply</Link></div>
        <div className="mt-5 space-y-3">
          {apps === null ? <div className="skeleton h-16 rounded-2xl" /> : apps.length === 0 ? <p className="text-chrome-2">You haven’t applied yet.</p> : apps.map((a) => (
            <div key={a.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div><p className="font-semibold">{a.full_name}</p><p className="text-xs text-mute">Ref {a.ref} · sent {prettyDate(a.created_at.slice(0, 10))}</p></div>
              <Badge tone={APP_TONE[a.status] ?? 'neutral'}>{APP_LABEL[a.status] ?? a.status}</Badge>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={saveProfile} className="glass refract rounded-[28px] p-6">
        <h2 className="font-serif text-3xl">Profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="p-name">Name</label><input id="p-name" className="field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="p-phone">WhatsApp / phone</label><input id="p-phone" className="field" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex items-center gap-3"><button className="btn btn-primary h-11 min-h-0">Save</button>{saved ? <span className="text-sm text-ok">{saved}</span> : null}</div>
      </form>
    </div>
  )
}
