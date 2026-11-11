'use client'
// Become a model: details + 3–6 photos (shrunk on the phone before upload) + consent → sign in → send.
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, useSession } from '@/lib/api'
import { AuthPanel } from './auth'
import { Icon, Spinner } from './ui'

const INTERESTS = ['Fashion', 'Portraits', 'Beauty', 'Commercial', 'Lifestyle', 'Fitness', 'Events']
type P = { file: Blob; url: string }
const YEAR = 365.25 * 86400_000
const isAdult = (dob: string) => { if (!dob) return false; const a = (Date.now() - Date.parse(`${dob}T00:00:00Z`)) / YEAR; return a >= 18 && a < 100 }
const latestAdultDob = () => new Date(Date.now() - 18 * YEAR).toISOString().slice(0, 10)

/** Resize to 1600 px on the long side, JPEG ~82%: a 6 MB phone photo becomes ~350 KB. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close?.()
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.82))
  } catch {
    if (file.size > 4 * 1024 * 1024) throw new Error('That photo couldn’t be prepared. Please choose a JPG or PNG under 4 MB.')
    return file
  }
}

export function ModelApply() {
  const { user, ready } = useSession()
  const [f, setF] = useState({ fullName: '', dob: '', gender: '', height: '', city: '', phone: '', social: '', experience: '', intro: '' })
  const [interests, setInterests] = useState<string[]>([])
  const [photos, setPhotos] = useState<P[]>([])
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [prep, setPrep] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the account once it loads
  useEffect(() => { if (user) setF((x) => ({ ...x, fullName: x.fullName || user.name, phone: x.phone || user.phone })) }, [user])
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function addPhotos(list: FileList | null) {
    if (!list) return
    setErr(''); setPrep(true)
    try {
      const room = 6 - photos.length
      const out: P[] = []
      for (const file of Array.from(list).slice(0, room)) { const b = await shrink(file); out.push({ file: b, url: URL.createObjectURL(b) }) }
      setPhotos((p) => [...p, ...out])
    } catch (e) { setErr((e as Error).message) } finally { setPrep(false) }
  }

  const adult = isAdult(f.dob)
  const ok = f.fullName.trim().length >= 3 && adult && f.city.trim().length >= 2 && /^\+?[0-9 ()-]{9,20}$/.test(f.phone) && !!f.experience && f.intro.trim().length >= 20 && photos.length >= 3 && consent

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const fd = new FormData()
      Object.entries(f).forEach(([k, v]) => fd.append(k, v))
      fd.append('interests', interests.join(', '))
      fd.append('consent', consent ? 'yes' : 'no')
      photos.forEach((p, i) => fd.append('photos', p.file, `photo-${i + 1}.jpg`))
      const r = await api<{ ref: string }>('/applications', { method: 'POST', body: fd })
      setDone(r.ref)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (done) return (
    <div className="glass refract glass-strong mx-auto max-w-xl rounded-[32px] p-8 text-center reveal">
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok"><Icon name="check" size={32} stroke={2.4} /></span>
      <h2 className="mt-6 font-serif text-4xl">Application sent</h2>
      <p className="mt-3 text-chrome-2">Thank you! Your reference is <b className="text-white">{done}</b>. Our team reviews every application; if your look fits an upcoming shoot, we’ll contact you on WhatsApp or by email.</p>
      <Link href="/account/" className="btn btn-primary mt-8">Track my application</Link>
    </div>
  )

  const max18 = latestAdultDob()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <fieldset className="glass refract rounded-[28px] p-6 sm:p-8">
        <legend className="sr-only">About you</legend>
        <p className="eyebrow">01 · About you</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="m-name">Full name</label><input id="m-name" className="field" autoComplete="name" value={f.fullName} onChange={set('fullName')} /></div>
          <div><label className="label" htmlFor="m-dob">Date of birth</label><input id="m-dob" className="field" type="date" max={max18} value={f.dob} onChange={set('dob')} />
            {f.dob && !adult ? <p className="mt-1.5 text-xs text-bad">You need to be 18 or older to apply.</p> : null}</div>
          <div><label className="label" htmlFor="m-gender">Gender <span className="normal-case tracking-normal text-mute">(optional)</span></label>
            <select id="m-gender" className="field" value={f.gender} onChange={set('gender')}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option></select></div>
          <div><label className="label" htmlFor="m-height">Height (cm) <span className="normal-case tracking-normal text-mute">(optional)</span></label><input id="m-height" className="field" type="number" inputMode="numeric" min={120} max={230} value={f.height} onChange={set('height')} placeholder="e.g. 172" /></div>
          <div><label className="label" htmlFor="m-city">Where are you based?</label><input id="m-city" className="field" autoComplete="address-level2" value={f.city} onChange={set('city')} placeholder="Suburb or town" /></div>
        </div>
      </fieldset>

      <fieldset className="glass refract rounded-[28px] p-6 sm:p-8">
        <legend className="sr-only">Contact and experience</legend>
        <p className="eyebrow">02 · Contact & experience</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="m-phone">WhatsApp / phone</label><input id="m-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 071 234 5678" /></div>
          <div><label className="label" htmlFor="m-social">Instagram or TikTok <span className="normal-case tracking-normal text-mute">(optional)</span></label><input id="m-social" className="field" value={f.social} onChange={set('social')} placeholder="@yourhandle" /></div>
        </div>
        <p className="label mt-6">Modelling experience</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[['none', 'New to it'], ['some', 'A few shoots'], ['experienced', 'Experienced']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setF((x) => ({ ...x, experience: v! }))} aria-pressed={f.experience === v}
              className={`rounded-2xl border px-4 py-3.5 text-left font-semibold transition-all ${f.experience === v ? 'border-white bg-white text-black' : 'glass border-white/10'}`}>{l}</button>
          ))}
        </div>
        <p className="label mt-6">Interested in <span className="normal-case tracking-normal text-mute">(pick any)</span></p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button key={i} type="button" onClick={() => setInterests((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))} aria-pressed={interests.includes(i)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${interests.includes(i) ? 'bg-white text-black' : 'glass text-chrome-2'}`}>{i}</button>
          ))}
        </div>
        <div className="mt-6"><label className="label" htmlFor="m-intro">Introduce yourself</label>
          <textarea id="m-intro" className="field" maxLength={800} value={f.intro} onChange={set('intro')} placeholder="A few sentences about you, your style and why you’d love to model with BANZA." />
          <p className="mt-1.5 text-right text-xs text-mute">{f.intro.length}/800</p></div>
      </fieldset>

      <fieldset className="glass refract rounded-[28px] p-6 sm:p-8">
        <legend className="sr-only">Photos</legend>
        <p className="eyebrow">03 · Your photos</p>
        <p className="mt-3 text-chrome-2">Add 3 to 6 recent photos: a clear headshot, a full-length photo, and one that shows your style. Natural light, no heavy filters.</p>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {photos.map((ph, i) => (
            <div key={ph.url} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={`Your photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))} className="glass glass-strong absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full" aria-label={`Remove photo ${i + 1}`}><Icon name="x" size={16} /></button>
            </div>
          ))}
          {photos.length < 6 ? (
            <label className="glass flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 text-center text-sm text-chrome-2">
              {prep ? <Spinner /> : <Icon name="plus" size={26} />}
              <span>{prep ? 'Preparing…' : photos.length ? 'Add more' : 'Add photos'}</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} disabled={prep} />
            </label>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-mute">{photos.length}/6 added{photos.length < 3 ? ` · add ${3 - photos.length} more` : ''}. Photos are resized on your phone to save data.</p>
      </fieldset>

      <label className="glass flex cursor-pointer gap-3 rounded-[22px] p-5">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#c9a45e]" />
        <span className="text-sm text-chrome-2">I’m 18 or older and I agree that BANZA Photography may store my details and photos to review my application and contact me about shoots. My photos stay private to the BANZA team and I can ask for them to be deleted at any time. <Link href="/privacy/" className="underline">Privacy policy</Link></span>
      </label>

      {!ready ? <div className="flex justify-center"><Spinner /></div> : user ? (
        <div className="space-y-3">
          {err ? <p role="alert" className="text-bad">{err}</p> : null}
          {!ok ? <p className="text-sm text-chrome-3">Complete every section (and add at least 3 photos) to apply.</p> : null}
          <button className="btn btn-maroon w-full" disabled={!ok || busy} onClick={submit}>{busy ? <><Spinner /> Uploading…</> : <>Send my application <Icon name="arrow" size={18} /></>}</button>
        </div>
      ) : <AuthPanel title="Sign in to send your application" intro="So we can contact you and you can track your application." />}
    </div>
  )
}
