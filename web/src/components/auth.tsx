'use client'
// Email-code sign-in: email → 6-digit code. Works inline (inside the booking and model flows) so
// nobody loses their progress, and as the account page's front door.
import { useEffect, useRef, useState } from 'react'
import { api, setToken, type User } from '@/lib/api'
import { Icon, Spinner } from './ui'

export function AuthPanel({ title = 'Sign in or create an account', intro, askName = true, onDone }: { title?: string; intro?: string; askName?: boolean; onDone?: (u: User) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  async function start(e?: React.FormEvent) {
    e?.preventDefault()
    setErr(''); setBusy(true)
    try {
      await api('/auth/start', { method: 'POST', json: { email } })
      setStep('code'); setResendIn(45)
      setTimeout(() => codeRef.current?.focus(), 80)
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  async function verify(c = code) {
    setErr(''); setBusy(true)
    try {
      const r = await api<{ token: string; user: User }>('/auth/verify', { method: 'POST', json: { email, code: c, name } })
      setToken(r.token)
      onDone?.(r.user)
    } catch (x) { setErr((x as Error).message); setCode('') } finally { setBusy(false) }
  }

  return (
    <div className="glass refract glass-strong rounded-[28px] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="glass glass-gold inline-flex h-11 w-11 items-center justify-center rounded-2xl"><Icon name={step === 'email' ? 'lock' : 'mail'} size={20} /></span>
        <div>
          <h2 className="font-serif text-2xl leading-tight">{step === 'email' ? title : 'Check your email'}</h2>
          <p className="text-sm text-chrome-3">{step === 'email' ? (intro ?? 'No password needed: we’ll email you a code.') : `We sent a 6-digit code to ${email}.`}</p>
        </div>
      </div>

      {step === 'email' ? (
        <form onSubmit={start} className="mt-6 space-y-4">
          {askName ? (
            <div><label className="label" htmlFor="auth-name">Your name</label>
              <input id="auth-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" /></div>
          ) : null}
          <div><label className="label" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="field" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          {err ? <p role="alert" className="text-sm text-bad">{err}</p> : null}
          <button className="btn btn-primary w-full" disabled={busy || !email}>{busy ? <Spinner /> : <>Email me a code <Icon name="arrow" size={18} /></>}</button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="label" htmlFor="auth-code">Code</label>
          <input id="auth-code" ref={codeRef} className="field text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) void verify(v) }} placeholder="••••••" />
          {err ? <p role="alert" className="text-sm text-bad">{err}</p> : null}
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6} onClick={() => verify()}>{busy ? <Spinner /> : 'Sign in'}</button>
          <div className="flex items-center justify-between text-sm">
            <button className="text-chrome-3 hover:text-white" onClick={() => { setStep('email'); setCode(''); setErr('') }}>Use a different email</button>
            <button className="text-gold-soft disabled:text-mute" disabled={resendIn > 0 || busy} onClick={() => start()}>{resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}</button>
          </div>
          <p className="text-xs text-mute">Can’t find it? Check your spam or promotions folder.</p>
        </div>
      )}
    </div>
  )
}
