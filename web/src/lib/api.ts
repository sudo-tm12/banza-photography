'use client'
// Talks to the BANZA API (../api). The site is static on GitHub Pages and the API lives on another
// origin, so sign-in uses a bearer token kept in localStorage (no third-party cookies, which
// Safari blocks). Tokens are random, stored hashed on the server, and expire after 30 days.
import { useCallback, useEffect, useState } from 'react'
import { SITE } from './site'

const KEY = 'banza.session'

export type Role = 'client' | 'admin'
export type User = { id: number; email: string; name: string; phone: string; role: Role }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function getToken(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export function setToken(t: string | null) {
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY) } catch { /* private mode */ }
  window.dispatchEvent(new Event('banza:session'))
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body = init.body
  if (init.json !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(init.json) }
  let res: Response
  try {
    res = await fetch(`${SITE.apiBase}${path}`, { ...init, headers, body })
  } catch {
    throw new ApiError(0, 'We couldn’t reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) setToken(null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Something went wrong. Please try again.')
  return data as T
}

/** The signed-in user (or null), kept in sync across components and tabs. */
export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const load = useCallback(async () => {
    if (!getToken()) { setUser(null); setReady(true); return }
    try { const r = await api<{ user: User }>('/me'); setUser(r.user) } catch { setUser(null) } finally { setReady(true) }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the session is the effect
    void load()
    const on = () => void load()
    window.addEventListener('banza:session', on)
    window.addEventListener('storage', on)
    return () => { window.removeEventListener('banza:session', on); window.removeEventListener('storage', on) }
  }, [load])
  const signOut = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* token already gone */ }
    setToken(null)
  }, [])
  return { user, ready, reload: load, signOut }
}
