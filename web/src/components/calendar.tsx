'use client'
// The booking calendar: a glass month grid showing open, limited, full and closed days from the API.
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Icon, Spinner } from './ui'

export type DayState = { status: 'open' | 'limited' | 'full' | 'closed'; free: string[] }
type Avail = { month: string; today: string; days: Record<string, DayState> }

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const shiftMonth = (m: string, d: number) => { const [y, mo] = m.split('-').map(Number) as [number, number]; const t = new Date(Date.UTC(y, mo - 1 + d, 15)); return t.toISOString().slice(0, 7) }
export const todayISO = () => new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10)

export function Calendar({ value, onPick, maxMonths = 4 }: { value: string | null; onPick: (date: string, day: DayState) => void; maxMonths?: number }) {
  const first = todayISO().slice(0, 7)
  const [month, setMonth] = useState(value?.slice(0, 7) ?? first)
  const [data, setData] = useState<Avail | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale month while loading
    setData(null); setErr('')
    api<Avail>(`/availability?month=${month}`).then((d) => { if (live) setData(d) }).catch((e) => { if (live) setErr((e as Error).message) })
    return () => { live = false }
  }, [month])

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number) as [number, number]
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7   // Monday first
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  }, [month])

  const canPrev = month > first
  const canNext = month < shiftMonth(first, maxMonths - 1)
  return (
    <div className="glass refract rounded-[28px] p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button className="glass inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-30" onClick={() => setMonth(shiftMonth(month, -1))} disabled={!canPrev} aria-label="Previous month"><Icon name="chevronL" /></button>
        <p className="font-serif text-2xl" aria-live="polite">{monthName(month)}</p>
        <button className="glass inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-30" onClick={() => setMonth(shiftMonth(month, 1))} disabled={!canNext} aria-label="Next month"><Icon name="chevron" /></button>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold uppercase tracking-wider text-mute">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="relative mt-2 grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />
          const st = data?.days[iso]
          const sel = iso === value
          const usable = st && (st.status === 'open' || st.status === 'limited')
          const day = Number(iso.slice(8))
          return (
            <button key={iso} disabled={!usable} onClick={() => st && onPick(iso, st)} aria-pressed={sel}
              aria-label={`${new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}: ${st ? { open: 'available', limited: 'a few times left', full: 'fully booked', closed: 'not available' }[st.status] : 'loading'}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-[0.98rem] font-semibold transition-all duration-300
                ${sel ? 'bg-white text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.6)]' : usable ? 'bg-white/[0.07] text-white hover:bg-white/15' : 'text-white/25'}
                ${st?.status === 'full' ? 'line-through decoration-white/20' : ''}`}>
              {day}
              {st && !sel && usable ? <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${st.status === 'open' ? 'bg-ok' : 'bg-warn'}`} /> : null}
            </button>
          )
        })}
        {!data && !err ? <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/40"><Spinner size={26} /></div> : null}
      </div>
      {err ? <p className="mt-4 text-sm text-bad">{err}</p> : null}
      <div className="mt-5 flex flex-wrap gap-4 text-xs text-chrome-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" /> Available</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" /> A few times left</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" /> Unavailable</span>
      </div>
    </div>
  )
}
