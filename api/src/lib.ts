// Shared helpers: env, HTTP (CORS for BANZA's site only), input cleaning, crypto, rate limits, mail.
export interface Env {
  DB: D1Database
  PHOTOS: KVNamespace
  ALLOWED_ORIGINS: string
  SITE_URL: string
  API_PUBLIC_URL: string
  MAIL_FROM: string
  MAIL_REPLY_TO: string
  MAIL_TRANSPORT: 'resend' | 'outbox'
  ADMIN_EMAILS: string
  RESEND_API_KEY?: string
  IP_SALT: string
  SIGNING_SECRET: string
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const ok = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  if (!origin || !ok.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin, Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  }
}

export const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } })

export async function readJson(req: Request, max = 20000): Promise<Record<string, unknown>> {
  if (!(req.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON required')
  const raw = await req.text()
  if (raw.length > max) throw new HttpError(413, 'That’s too much data.')
  try { const d = JSON.parse(raw); if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown> } catch { /* fall through */ }
  throw new HttpError(400, 'Invalid request')
}

export function clean(v: unknown, max: number): string {
  const s = typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
  // eslint-disable-next-line no-control-regex
  return [...s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()].slice(0, max).join('')
}
export const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
export const isEmail = (s: string) => s.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
export const isPhone = (s: string) => /^\+?[0-9 ()-]{9,20}$/.test(s)
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
export const nowSql = (d = new Date()) => d.toISOString().slice(0, 19).replace('T', ' ')
/** Today's date in South Africa (UTC+2, no daylight saving). */
export const todaySA = (d = new Date()) => new Date(d.getTime() + 2 * 3600_000).toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
export async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)))
}
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
export const randomToken = (bytes = 32) => hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
export function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}
/** Short, readable reference: BZB-7K2M9Q (no 0/O/1/I). */
export function ref(prefix: string) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return `${prefix}-${[...crypto.getRandomValues(new Uint8Array(6))].map((b) => a[b % a.length]).join('')}`
}

export const ipHash = async (req: Request, env: Env) => sha256(`${env.IP_SALT}|${req.headers.get('CF-Connecting-IP') ?? '0.0.0.0'}`)

/** Sliding-window rate limit (one statement; a blocked caller's window isn't extended). */
export async function limited(env: Env, key: string, action: string, max: number, seconds: number) {
  const since = nowSql(new Date(Date.now() - seconds * 1000))
  const r = await env.DB.prepare(`INSERT INTO rate_events (action, ip_hash, created_at)
    SELECT ?1, ?2, ?3 WHERE (SELECT COUNT(*) FROM rate_events WHERE action = ?1 AND ip_hash = ?2 AND created_at > ?4) < ?5`)
    .bind(action, key, nowSql(), since, max).run()
  return r.meta.changes === 0
}

export async function getSettings(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  return Object.fromEntries(results.map((r) => [r.key, r.value]))
}

// ── Mail ─────────────────────────────────────────────────────────────────────
export type Mail = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }

export async function sendMail(env: Env, m: Mail): Promise<boolean> {
  const to = (Array.isArray(m.to) ? m.to : [m.to]).filter(isEmail)
  if (!to.length) return false
  const subject = oneLine(m.subject)
  try {
    if (env.MAIL_TRANSPORT === 'outbox') {
      await env.DB.prepare('INSERT INTO outbox (created_at, to_addr, subject, html, text) VALUES (?, ?, ?, ?, ?)').bind(nowSql(), to.join(', '), subject, m.html, m.text).run()
      return true
    }
    if (!env.RESEND_API_KEY) { console.error('[mail] RESEND_API_KEY missing'); return false }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html: m.html, text: m.text, reply_to: m.replyTo ?? env.MAIL_REPLY_TO }),
    })
    if (!res.ok) console.error('[mail] Resend refused', res.status, (await res.text()).slice(0, 300))
    return res.ok
  } catch (e) {
    console.error('[mail] failed', e instanceof Error ? e.message : e)
    return false
  }
}

/** BANZA's email look: black header with the chrome wordmark feel, white card, gold accents. */
export function layout(title: string, inner: string, cta?: { href: string; label: string }) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;background:#f4f2ee;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#141418">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
    + '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e7e3dc">'
    + '<tr><td style="background:#08080a;padding:26px 28px;text-align:center"><div style="font-family:Georgia,serif;font-size:26px;letter-spacing:8px;color:#e8e8ec">BANZA</div>'
    + '<div style="font-size:10px;letter-spacing:6px;color:#9a9aa3;margin-top:4px">PHOTOGRAPHY</div></td></tr>'
    + '<tr><td style="height:3px;background:linear-gradient(90deg,#6e0f18,#c9a45e,#6e0f18)"></td></tr>'
    + `<tr><td style="padding:30px 28px"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:26px;line-height:1.2">${esc(title)}</h1>${inner}`
    + (cta ? `<p style="margin:26px 0 4px"><a href="${esc(cta.href)}" style="display:inline-block;background:#6e0f18;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:600">${esc(cta.label)}</a></p>` : '')
    + '</td></tr>'
    + '<tr><td style="padding:18px 28px;border-top:1px solid #eee;color:#77777f;font-size:12px;line-height:1.6">BANZA Photography · Capturing today. Creating tomorrow.<br>banzaphotography@gmail.com · Instagram @banza_photography</td></tr>'
    + '</table></td></tr></table></body></html>'
}
export const p = (html: string) => `<p style="margin:0 0 12px;line-height:1.6;font-size:15px">${html}</p>`
export const rows = (pairs: [string, string][]) => '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 14px;font-size:14px">'
  + pairs.map(([k, v]) => `<tr><td style="padding:7px 0;color:#77777f;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;font-weight:600">${esc(v)}</td></tr>`).join('') + '</table>'
