// BANZA Photography API (Cloudflare Worker + D1 + KV + Resend).
//   Public:  GET /public/config · GET /availability?month= · GET /photos/<key>?exp=&sig= (signed, admin only)
//   Auth:    POST /auth/start · POST /auth/verify · POST /auth/logout · GET/PATCH /me
//   Client:  POST /bookings · GET /bookings/mine · POST /bookings/<ref>/cancel · POST /applications · GET /applications/mine
//   Admin:   /admin/summary · /admin/bookings · /admin/applications · /admin/calendar · /admin/blocked · /admin/settings · /admin/shoot-types
import {
  addDays, clean, cors, esc, getSettings, hmac, HttpError, ipHash, isEmail, isPhone, json, layout, limited, nowSql, oneLine, p,
  randomCode, randomToken, readJson, ref, rows, safeEqual, sendMail, sha256, todaySA, type Env,
} from './lib'

const SLOTS = [
  { id: 'morning', label: 'Morning', time: '08:00 – 11:00' },
  { id: 'midday', label: 'Midday', time: '11:00 – 14:00' },
  { id: 'afternoon', label: 'Afternoon', time: '14:00 – 17:00' },
  { id: 'golden', label: 'Golden hour', time: '17:00 – 19:00' },
  { id: 'evening', label: 'Evening', time: '19:00 – 22:00' },
]
const SLOT_IDS = SLOTS.map((s) => s.id)
const slotLabel = (id: string) => { const s = SLOTS.find((x) => x.id === id); return s ? `${s.label} (${s.time})` : id }
const BANDS: Record<string, string> = { 'under-5': 'Under 5 km (free)', '5-10': '5–10 km (R100)', '10-15': '10–15 km (R200)', '15-20': '15–20 km (R300)', 'over-20': 'Further than 20 km (quoted)' }
const BOOKING_STATUS = ['pending', 'confirmed', 'completed', 'declined', 'cancelled']
const APP_STATUS = ['new', 'contacted', 'shortlisted', 'accepted', 'declined']
const SESSION_DAYS = 30

type User = { id: number; email: string; name: string; phone: string; role: string }
const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role === 'admin' ? 'admin' : 'client' })
const prettyDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// ── Auth ─────────────────────────────────────────────────────────────────────
async function currentUser(req: Request, env: Env): Promise<User | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization') ?? '')
  if (!m) return null
  const row = await env.DB.prepare(`SELECT u.id, u.email, u.name, u.phone, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).bind(await sha256(m[1]!), nowSql()).first<User>()
  return row ?? null
}
async function requireUser(req: Request, env: Env) {
  const u = await currentUser(req, env)
  if (!u) throw new HttpError(401, 'Please sign in to continue.')
  return u
}
async function requireAdmin(req: Request, env: Env) {
  const u = await requireUser(req, env)
  if (u.role !== 'admin') throw new HttpError(403, 'This area is for the BANZA team.')
  return u
}
async function adminEmails(env: Env) {
  const s = await getSettings(env)
  return new Set(`${env.ADMIN_EMAILS},${s.admin_emails ?? ''}`.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))
}

async function authStart(req: Request, env: Env) {
  const b = await readJson(req)
  const email = clean(b.email, 190).toLowerCase()
  if (!isEmail(email)) throw new HttpError(422, 'Please enter a valid email address.')
  const ip = await ipHash(req, env)
  if (await limited(env, ip, 'otp-ip', 8, 600) || await limited(env, await sha256(email), 'otp-email', 4, 600)) {
    throw new HttpError(429, 'Too many codes requested. Please wait a few minutes and try again.')
  }
  const code = randomCode()
  await env.DB.prepare(`INSERT INTO otp_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?1, ?2, ?3, 0, ?4)
    ON CONFLICT(email) DO UPDATE SET code_hash = ?2, expires_at = ?3, attempts = 0, created_at = ?4`)
    .bind(email, await hmac(env.SIGNING_SECRET, `${email}|${code}`), nowSql(new Date(Date.now() + 10 * 60_000)), nowSql()).run()
  const sent = await sendMail(env, {
    to: email, subject: `${code} is your BANZA Photography sign-in code`,
    html: layout('Your sign-in code', p('Use this code to sign in to BANZA Photography. It expires in 10 minutes.')
      + `<p style="margin:18px 0;font-size:34px;letter-spacing:10px;font-weight:700;font-family:Consolas,monospace">${code}</p>`
      + p('<span style="color:#77777f">Didn’t ask for this? You can ignore this email: nobody can sign in without the code.</span>')),
    text: `Your BANZA Photography sign-in code is ${code}. It expires in 10 minutes.`,
  })
  if (!sent) throw new HttpError(502, 'We couldn’t send the code just now. Please try again in a moment.')
  return json(200, { ok: true })
}

async function authVerify(req: Request, env: Env) {
  const b = await readJson(req)
  const email = clean(b.email, 190).toLowerCase()
  const code = clean(b.code, 12).replace(/\D/g, '')
  const name = oneLine(clean(b.name, 80))
  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM otp_codes WHERE email = ?').bind(email).first<{ code_hash: string; expires_at: string; attempts: number }>()
  if (!row || row.expires_at < nowSql()) throw new HttpError(400, 'That code has expired. Please request a new one.')
  if (row.attempts >= 5) throw new HttpError(429, 'Too many tries. Please request a new code.')
  if (!safeEqual(row.code_hash, await hmac(env.SIGNING_SECRET, `${email}|${code}`))) {
    await env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run()
    throw new HttpError(400, 'That code isn’t right. Check the email and try again.')
  }
  await env.DB.prepare('DELETE FROM otp_codes WHERE email = ?').bind(email).run()
  const role = (await adminEmails(env)).has(email) ? 'admin' : 'client'
  await env.DB.prepare(`INSERT INTO users (email, name, role, created_at, last_login) VALUES (?1, ?2, ?3, ?4, ?4)
    ON CONFLICT(email) DO UPDATE SET last_login = ?4, role = ?3, name = CASE WHEN users.name = '' THEN ?2 ELSE users.name END`)
    .bind(email, name, role, nowSql()).run()
  const user = (await env.DB.prepare('SELECT id, email, name, phone, role FROM users WHERE email = ?').bind(email).first<User>())!
  const token = randomToken()
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), user.id, nowSql(new Date(Date.now() + SESSION_DAYS * 86400_000)), nowSql()).run()
  return json(200, { token, user: publicUser(user) })
}

// ── Availability ─────────────────────────────────────────────────────────────
type DayState = { status: 'open' | 'limited' | 'full' | 'closed'; free: string[] }
async function monthAvailability(env: Env, month: string, settings: Record<string, string>): Promise<Record<string, DayState>> {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const first = `${month}-01`, last = `${month}-${String(days).padStart(2, '0')}`
  const lead = Number(settings.lead_days ?? 2), windowDays = Number(settings.window_days ?? 120)
  const working = settings.working_days ?? '0123456'
  const minDate = addDays(todaySA(), lead), maxDate = addDays(todaySA(), windowDays)
  const [{ results: taken }, { results: blocked }] = await Promise.all([
    env.DB.prepare(`SELECT date, slot FROM bookings WHERE date BETWEEN ? AND ? AND status IN ('pending','confirmed')`).bind(first, last).all<{ date: string; slot: string }>(),
    env.DB.prepare('SELECT date FROM blocked_dates WHERE date BETWEEN ? AND ?').bind(first, last).all<{ date: string }>(),
  ])
  const blockedSet = new Set(blocked.map((b) => b.date))
  const out: Record<string, DayState> = {}
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay()
    if (iso < minDate || iso > maxDate || blockedSet.has(iso) || !working.includes(String(dow))) { out[iso] = { status: 'closed', free: [] }; continue }
    const used = new Set(taken.filter((t) => t.date === iso).map((t) => t.slot))
    const free = SLOT_IDS.filter((s) => !used.has(s))
    out[iso] = { status: free.length === 0 ? 'full' : free.length <= 2 ? 'limited' : 'open', free }
  }
  return out
}

// ── Bookings ─────────────────────────────────────────────────────────────────
async function createBooking(req: Request, env: Env) {
  const user = await requireUser(req, env)
  if (await limited(env, String(user.id), 'booking', 6, 3600)) throw new HttpError(429, 'You’ve sent several requests already. Our team will be in touch soon.')
  const b = await readJson(req)
  const settings = await getSettings(env)
  const type = await env.DB.prepare('SELECT id, name FROM shoot_types WHERE (slug = ? OR id = ?) AND active = 1').bind(clean(b.shootType, 40), Number(b.shootType) || -1).first<{ id: number; name: string }>()
  if (!type) throw new HttpError(422, 'Please choose a type of shoot.')
  const date = clean(b.date, 10), slot = clean(b.slot, 20)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOT_IDS.includes(slot)) throw new HttpError(422, 'Please choose a date and time.')
  const day = (await monthAvailability(env, date.slice(0, 7), settings))[date]
  if (!day || day.status === 'closed') throw new HttpError(409, 'That date isn’t available. Please pick another.')
  if (!day.free.includes(slot)) throw new HttpError(409, 'That time was just taken. Please choose another time.')
  const location = clean(b.location, 200), band = clean(b.distanceBand, 12), phone = clean(b.phone, 20)
  const people = Math.max(1, Math.min(500, Number(b.people) || 1)), notes = clean(b.notes, 1000)
  const name = oneLine(clean(b.name, 80))
  if (location.length < 3) throw new HttpError(422, 'Please tell us where the shoot will be.')
  if (!BANDS[band]) throw new HttpError(422, 'Please choose how far the location is.')
  if (!isPhone(phone)) throw new HttpError(422, 'Please enter a phone number we can WhatsApp or call.')
  const r = ref('BZB')
  try {
    await env.DB.prepare(`INSERT INTO bookings (ref, user_id, shoot_type_id, date, slot, location, distance_band, people, notes, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(r, user.id, type.id, date, slot, location, band, people, notes, phone, nowSql(), nowSql()).run()
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, 'That time was just taken. Please choose another time.')
    throw e
  }
  await env.DB.prepare(`UPDATE users SET phone = CASE WHEN phone = '' THEN ?1 ELSE phone END, name = CASE WHEN name = '' THEN ?2 ELSE name END WHERE id = ?3`).bind(phone, name, user.id).run()
  const who = name || user.name || user.email
  const details: [string, string][] = [['Reference', r], ['Shoot', type.name], ['Date', prettyDate(date)], ['Time', slotLabel(slot)], ['Location', location], ['Distance', BANDS[band]!], ['People', String(people)]]
  const pa = (settings.pa_emails ?? '').split(',').map((s) => s.trim())
  await Promise.all([
    sendMail(env, {
      to: pa, replyTo: user.email, subject: `New booking request: ${type.name}, ${prettyDate(date)} (${who})`,
      html: layout('New booking request', p(`<b>${esc(who)}</b> would like to book a shoot.`) + rows([...details, ['Phone', phone], ['Email', user.email], ['Notes', notes || '—']])
        + p('Contact them to confirm, then mark it confirmed in the dashboard.'), { href: `${env.SITE_URL}/admin/?tab=bookings`, label: 'Open the dashboard' }),
      text: `New booking request ${r}: ${type.name} on ${date} (${slot}) for ${who}, ${phone}, ${user.email}. Location: ${location}. Notes: ${notes}`,
    }),
    sendMail(env, {
      to: user.email, subject: `We’ve received your booking request (${r})`,
      html: layout('Your request is in', p(`Thank you${name ? `, ${esc(name.split(' ')[0]!)}` : ''}! Here’s what you asked for:`) + rows(details)
        + p('Mr Banza’s assistant will contact you shortly to confirm the details and the quote. <b>A 50% deposit of the agreed rate secures your booking.</b>')
        + p('<span style="color:#77777f">Travel: free under 5 km, then R100 (5–10 km), R200 (10–15 km), R300 (15–20 km).</span>'), { href: `${env.SITE_URL}/account/`, label: 'View your booking' }),
      text: `We've received your booking request ${r}: ${type.name} on ${date}. We'll contact you to confirm. A 50% deposit secures your booking.`,
    }),
  ])
  return json(201, { ref: r })
}

const BOOKING_SELECT = `SELECT b.id, b.ref, b.date, b.slot, b.location, b.distance_band, b.people, b.notes, b.phone, b.status, b.deposit_paid, b.pa_notes, b.created_at, b.updated_at,
  t.name AS shoot, t.slug AS shoot_slug, u.name AS client_name, u.email AS client_email FROM bookings b JOIN shoot_types t ON t.id = b.shoot_type_id JOIN users u ON u.id = b.user_id`

// ── Applications ─────────────────────────────────────────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
async function createApplication(req: Request, env: Env) {
  const user = await requireUser(req, env)
  if (await limited(env, String(user.id), 'application', 3, 86400)) throw new HttpError(429, 'You’ve already applied today. Our team will review your application.')
  const ct = req.headers.get('Content-Type') ?? ''
  if (!ct.startsWith('multipart/form-data')) throw new HttpError(415, 'Please submit the form with your photos.')
  const len = Number(req.headers.get('Content-Length') ?? 0)
  if (len > 25 * 1024 * 1024) throw new HttpError(413, 'Your photos are too large. Please choose smaller ones.')
  const form = await req.formData()
  const f = (k: string, max: number) => clean(form.get(k), max)
  const fullName = oneLine(f('fullName', 80)), dob = f('dob', 10), city = oneLine(f('city', 80)), phone = f('phone', 20)
  const gender = f('gender', 30), social = oneLine(f('social', 120)), experience = f('experience', 30), interests = f('interests', 200), intro = f('intro', 800)
  const height = Number(f('height', 4)) || null
  if (fullName.length < 3) throw new HttpError(422, 'Please enter your full name.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new HttpError(422, 'Please enter your date of birth.')
  const age = (Date.now() - Date.parse(`${dob}T00:00:00Z`)) / (365.25 * 86400_000)
  if (!(age >= 18 && age < 100)) throw new HttpError(422, 'You need to be 18 or older to apply.')
  if (city.length < 2) throw new HttpError(422, 'Please tell us where you’re based.')
  if (!isPhone(phone)) throw new HttpError(422, 'Please enter a phone number we can WhatsApp or call.')
  if (!['none', 'some', 'experienced'].includes(experience)) throw new HttpError(422, 'Please choose your modelling experience.')
  if (intro.length < 20) throw new HttpError(422, 'Please write a short introduction (a few sentences).')
  if (form.get('consent') !== 'yes') throw new HttpError(422, 'Please agree to the privacy terms to apply.')
  const files = form.getAll('photos').filter((x): x is File => typeof x !== 'string')
  if (files.length < 3 || files.length > 6) throw new HttpError(422, 'Please add between 3 and 6 photos.')
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) throw new HttpError(422, 'Photos must be JPG, PNG or WebP.')
    if (file.size > 4 * 1024 * 1024) throw new HttpError(422, 'Each photo must be under 4 MB.')
  }
  const r = ref('BZM')
  const keys: string[] = []
  for (const [i, file] of files.entries()) {
    const key = `apps/${r}/${i + 1}.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`
    await env.PHOTOS.put(key, await file.arrayBuffer(), { metadata: { type: file.type } })
    keys.push(key)
  }
  await env.DB.prepare(`INSERT INTO applications (ref, user_id, full_name, dob, gender, height_cm, city, phone, social, experience, interests, intro, photos, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(r, user.id, fullName, dob, gender, height, city, phone, social, experience, interests, intro, JSON.stringify(keys), nowSql(), nowSql()).run()
  await env.DB.prepare(`UPDATE users SET phone = CASE WHEN phone = '' THEN ?1 ELSE phone END, name = CASE WHEN name = '' THEN ?2 ELSE name END WHERE id = ?3`).bind(phone, fullName, user.id).run()
  const settings = await getSettings(env)
  await Promise.all([
    sendMail(env, {
      to: (settings.pa_emails ?? '').split(','), replyTo: user.email, subject: `New model application: ${fullName} (${city})`,
      html: layout('New model application', rows([['Reference', r], ['Name', fullName], ['Age', String(Math.floor(age))], ['Based in', city], ['Experience', experience], ['Interests', interests || '—'], ['Phone', phone], ['Email', user.email], ['Social', social || '—']])
        + p(`<i>“${esc(intro)}”</i>`) + p(`${keys.length} photos attached in the dashboard.`), { href: `${env.SITE_URL}/admin/?tab=models`, label: 'Review in the dashboard' }),
      text: `New model application ${r}: ${fullName}, ${city}, ${phone}, ${user.email}.`,
    }),
    sendMail(env, {
      to: user.email, subject: `Your BANZA model application is in (${r})`,
      html: layout('Thank you for applying', p(`Hi ${esc(fullName.split(' ')[0]!)}, we’ve received your application and photos.`)
        + p('Our team reviews every application. If your look fits an upcoming shoot, Mr Banza’s assistant will contact you on WhatsApp or by email.')
        + p('<span style="color:#77777f">Your photos are stored privately and only seen by the BANZA team. You can ask us to delete them at any time.</span>'), { href: `${env.SITE_URL}/account/`, label: 'Track your application' }),
      text: `We've received your BANZA model application ${r}. We'll be in touch if your look fits an upcoming shoot.`,
    }),
  ])
  return json(201, { ref: r })
}

async function signedPhotoUrl(env: Env, key: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${env.API_PUBLIC_URL}/photos/${key}?exp=${exp}&sig=${await hmac(env.SIGNING_SECRET, `${key}|${exp}`)}`
}

// ── Admin ────────────────────────────────────────────────────────────────────
async function notifyBooking(env: Env, id: number, message: string) {
  const b = await env.DB.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).bind(id).first<Record<string, string>>()
  if (!b) return
  const titles: Record<string, string> = { confirmed: 'Your shoot is confirmed', declined: 'About your booking request', completed: 'Thank you for shooting with BANZA', cancelled: 'Your booking was cancelled', pending: 'An update on your booking' }
  const lead: Record<string, string> = {
    confirmed: 'Great news: your shoot is confirmed. We can’t wait!', declined: 'Unfortunately we can’t take this booking. We’re sorry, and we’d love to find you another date.',
    completed: 'Thank you for choosing BANZA Photography. Your memories are in good hands.', cancelled: 'Your booking has been cancelled.', pending: 'There’s an update on your booking.',
  }
  await sendMail(env, {
    to: b.client_email!, subject: `${titles[b.status!] ?? 'Booking update'} (${b.ref})`,
    html: layout(titles[b.status!] ?? 'Booking update', p(lead[b.status!] ?? '') + (message ? p(esc(message).replace(/\n/g, '<br>')) : '')
      + rows([['Reference', b.ref!], ['Shoot', b.shoot!], ['Date', prettyDate(b.date!)], ['Time', slotLabel(b.slot!)], ['Location', b.location!]]), { href: `${env.SITE_URL}/account/`, label: 'View your booking' }),
    text: `${titles[b.status!] ?? 'Booking update'}: ${b.ref} ${b.shoot} on ${b.date}. ${message}`,
  })
}
async function notifyApplication(env: Env, id: number, message: string) {
  const a = await env.DB.prepare('SELECT a.ref, a.full_name, a.status, u.email FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?').bind(id).first<Record<string, string>>()
  if (!a) return
  const lead: Record<string, string> = {
    contacted: 'Thanks for applying! Our team would like to chat with you about an upcoming shoot.', shortlisted: 'Good news: you’ve been shortlisted for an upcoming BANZA shoot.',
    accepted: 'Congratulations, you’ve been selected to model with BANZA Photography!', declined: 'Thank you for applying. We won’t be moving forward this time, but we’ll keep your details for future shoots if you’re happy for us to.', new: '',
  }
  await sendMail(env, {
    to: a.email!, subject: `An update on your BANZA model application (${a.ref})`,
    html: layout('Your model application', p(`Hi ${esc(a.full_name!.split(' ')[0]!)},`) + p(lead[a.status!] ?? '') + (message ? p(esc(message).replace(/\n/g, '<br>')) : ''), { href: `${env.SITE_URL}/account/`, label: 'View your application' }),
    text: `Update on your BANZA model application ${a.ref}: ${a.status}. ${message}`,
  })
}

async function admin(req: Request, env: Env, path: string, url: URL): Promise<Response> {
  await requireAdmin(req, env)
  const method = req.method
  if (path === '/admin/summary' && method === 'GET') {
    const today = todaySA()
    const [pending, upcoming, apps, next, latest] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE status = 'pending'`).first<{ n: number }>(),
      env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE status = 'confirmed' AND date BETWEEN ? AND ?`).bind(today, addDays(today, 7)).first<{ n: number }>(),
      env.DB.prepare(`SELECT COUNT(*) n FROM applications WHERE status = 'new'`).first<{ n: number }>(),
      env.DB.prepare(`${BOOKING_SELECT} WHERE b.date >= ? AND b.status IN ('pending','confirmed') ORDER BY b.date, b.slot LIMIT 6`).bind(today).all(),
      env.DB.prepare(`SELECT id, ref, full_name, city, status, created_at FROM applications ORDER BY created_at DESC LIMIT 5`).all(),
    ])
    return json(200, { pending: pending?.n ?? 0, upcomingWeek: upcoming?.n ?? 0, newApplications: apps?.n ?? 0, next: next.results, latest: latest.results })
  }
  if (path === '/admin/bookings' && method === 'GET') {
    const status = url.searchParams.get('status') ?? ''
    const where = BOOKING_STATUS.includes(status) ? 'WHERE b.status = ?' : status === 'active' ? `WHERE b.status IN ('pending','confirmed')` : ''
    const order = status === 'completed' || status === 'declined' || status === 'cancelled' ? 'b.date DESC' : 'b.date ASC, b.slot'
    const stmt = env.DB.prepare(`${BOOKING_SELECT} ${where} ORDER BY ${order} LIMIT 300`)
    const { results } = await (BOOKING_STATUS.includes(status) ? stmt.bind(status) : stmt).all()
    return json(200, { bookings: results, slots: SLOTS })
  }
  let m = /^\/admin\/bookings\/(\d+)$/.exec(path)
  if (m && method === 'PATCH') {
    const id = Number(m[1]), b = await readJson(req)
    const sets: string[] = [], vals: unknown[] = []
    if (typeof b.status === 'string' && BOOKING_STATUS.includes(b.status)) { sets.push('status = ?'); vals.push(b.status) }
    if (typeof b.deposit_paid === 'boolean') { sets.push('deposit_paid = ?'); vals.push(b.deposit_paid ? 1 : 0) }
    if (typeof b.pa_notes === 'string') { sets.push('pa_notes = ?'); vals.push(clean(b.pa_notes, 2000)) }
    if (!sets.length) throw new HttpError(422, 'Nothing to change.')
    try {
      await env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...vals, nowSql(), id).run()
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'Another live booking already holds that slot.')
      throw e
    }
    if (b.notify === true && typeof b.status === 'string') await notifyBooking(env, id, clean(b.message, 1500))
    return json(200, { ok: true })
  }
  if (path === '/admin/applications' && method === 'GET') {
    const status = url.searchParams.get('status') ?? ''
    const stmt = env.DB.prepare(`SELECT a.*, u.email FROM applications a JOIN users u ON u.id = a.user_id ${APP_STATUS.includes(status) ? 'WHERE a.status = ?' : ''} ORDER BY a.created_at DESC LIMIT 200`)
    const { results } = await (APP_STATUS.includes(status) ? stmt.bind(status) : stmt).all<Record<string, unknown>>()
    for (const a of results) a.photo_urls = await Promise.all((JSON.parse(String(a.photos ?? '[]')) as string[]).map((k) => signedPhotoUrl(env, k)))
    return json(200, { applications: results })
  }
  m = /^\/admin\/applications\/(\d+)$/.exec(path)
  if (m && method === 'PATCH') {
    const id = Number(m[1]), b = await readJson(req)
    const sets: string[] = [], vals: unknown[] = []
    if (typeof b.status === 'string' && APP_STATUS.includes(b.status)) { sets.push('status = ?'); vals.push(b.status) }
    if (typeof b.pa_notes === 'string') { sets.push('pa_notes = ?'); vals.push(clean(b.pa_notes, 2000)) }
    if (!sets.length) throw new HttpError(422, 'Nothing to change.')
    await env.DB.prepare(`UPDATE applications SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...vals, nowSql(), id).run()
    if (b.notify === true && typeof b.status === 'string') await notifyApplication(env, id, clean(b.message, 1500))
    return json(200, { ok: true })
  }
  if (m && method === 'DELETE') {
    const a = await env.DB.prepare('SELECT photos FROM applications WHERE id = ?').bind(Number(m[1])).first<{ photos: string }>()
    if (a) for (const k of JSON.parse(a.photos) as string[]) await env.PHOTOS.delete(k)
    await env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(Number(m[1])).run()
    return json(200, { ok: true })
  }
  if (path === '/admin/calendar' && method === 'GET') {
    const month = url.searchParams.get('month') ?? todaySA().slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(422, 'Bad month')
    const [{ results: bookings }, { results: blocked }] = await Promise.all([
      env.DB.prepare(`${BOOKING_SELECT} WHERE b.date LIKE ? AND b.status IN ('pending','confirmed','completed') ORDER BY b.date, b.slot`).bind(`${month}-%`).all(),
      env.DB.prepare('SELECT date, reason FROM blocked_dates WHERE date LIKE ?').bind(`${month}-%`).all(),
    ])
    return json(200, { month, bookings, blocked, slots: SLOTS })
  }
  if (path === '/admin/blocked' && method === 'PUT') {
    const b = await readJson(req)
    const date = clean(b.date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(422, 'Bad date')
    if (b.blocked) await env.DB.prepare('INSERT OR REPLACE INTO blocked_dates (date, reason) VALUES (?, ?)').bind(date, clean(b.reason, 120)).run()
    else await env.DB.prepare('DELETE FROM blocked_dates WHERE date = ?').bind(date).run()
    return json(200, { ok: true })
  }
  if (path === '/admin/settings' && method === 'GET') {
    const [settings, { results: types }] = await Promise.all([getSettings(env), env.DB.prepare('SELECT * FROM shoot_types ORDER BY sort, id').all()])
    return json(200, { settings, shootTypes: types })
  }
  if (path === '/admin/settings' && method === 'PUT') {
    const b = await readJson(req)
    const allowed: Record<string, number> = { pa_emails: 600, admin_emails: 600, instagram: 200, tiktok: 200, facebook: 200, whatsapp: 30, lead_days: 3, window_days: 4, working_days: 7 }
    for (const [k, max] of Object.entries(allowed)) {
      if (typeof b[k] !== 'string') continue
      let v = clean(b[k], max)
      if (k.endsWith('_emails')) { v = v.split(/[,\s]+/).map((e) => e.toLowerCase()).filter(isEmail).join(','); if (!v) throw new HttpError(422, 'Keep at least one email address.') }
      if ((k === 'instagram' || k === 'tiktok' || k === 'facebook') && v && !/^https:\/\//.test(v)) throw new HttpError(422, 'Social links must start with https://')
      if (k === 'lead_days' || k === 'window_days') v = String(Math.max(0, Math.min(k === 'lead_days' ? 30 : 365, Number(v) || 0)))
      if (k === 'working_days') v = [...new Set(v.replace(/[^0-6]/g, ''))].sort().join('')
      await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(k, v).run()
    }
    return json(200, { ok: true })
  }
  if (path === '/admin/shoot-types' && method === 'PUT') {
    const b = await readJson(req, 40000)
    const list = Array.isArray(b.types) ? (b.types as Record<string, unknown>[]) : []
    for (const [i, t] of list.entries()) {
      const name = oneLine(clean(t.name, 60))
      if (!name) continue
      const slug = clean(t.slug, 40) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const vals = [name, clean(t.description, 300), clean(t.duration, 40), clean(t.price_note, 80), t.active === false || t.active === 0 ? 0 : 1, i + 1]
      if (Number(t.id)) await env.DB.prepare('UPDATE shoot_types SET name = ?, description = ?, duration = ?, price_note = ?, active = ?, sort = ? WHERE id = ?').bind(...vals, Number(t.id)).run()
      else await env.DB.prepare('INSERT INTO shoot_types (name, description, duration, price_note, active, sort, slug) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(...vals, slug).run()
    }
    return json(200, { ok: true })
  }
  throw new HttpError(404, 'Not found')
}

// ── Router ───────────────────────────────────────────────────────────────────
async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const method = req.method

  if (path === '/' || path === '/health') return json(200, { ok: true, service: 'banza-api' })
  if (path === '/public/config' && method === 'GET') {
    const [s, { results: types }] = await Promise.all([getSettings(env), env.DB.prepare('SELECT id, slug, name, description, duration, price_note, active, sort FROM shoot_types WHERE active = 1 ORDER BY sort, id').all()])
    return json(200, { shootTypes: types, slots: SLOTS, socials: { instagram: s.instagram ?? '', tiktok: s.tiktok ?? '', facebook: s.facebook ?? '', whatsapp: s.whatsapp ?? '' }, leadDays: Number(s.lead_days ?? 2), windowDays: Number(s.window_days ?? 120) }, { 'Cache-Control': 'public, max-age=60' })
  }
  if (path === '/availability' && method === 'GET') {
    const month = url.searchParams.get('month') ?? ''
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(422, 'Bad month')
    return json(200, { month, today: todaySA(), days: await monthAvailability(env, month, await getSettings(env)), slots: SLOTS })
  }
  if (path.startsWith('/photos/') && method === 'GET') {
    const key = decodeURIComponent(path.slice('/photos/'.length))
    const exp = Number(url.searchParams.get('exp')), sig = url.searchParams.get('sig') ?? ''
    if (!/^apps\/BZM-[A-Z0-9]{6}\/\d\.(jpg|png|webp)$/.test(key) || !exp || exp < Date.now() / 1000 || !safeEqual(sig, await hmac(env.SIGNING_SECRET, `${key}|${exp}`))) throw new HttpError(403, 'Link expired')
    const obj = await env.PHOTOS.getWithMetadata<{ type: string }>(key, 'arrayBuffer')
    if (!obj.value) throw new HttpError(404, 'Not found')
    return new Response(obj.value, { headers: { 'Content-Type': obj.metadata?.type ?? 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } })
  }
  if (path === '/auth/start' && method === 'POST') return authStart(req, env)
  if (path === '/auth/verify' && method === 'POST') return authVerify(req, env)
  if (path === '/auth/logout' && method === 'POST') {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization') ?? '')
    if (m) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1]!)).run()
    return json(200, { ok: true })
  }
  if (path === '/me' && method === 'GET') return json(200, { user: publicUser(await requireUser(req, env)) })
  if (path === '/me' && method === 'PATCH') {
    const u = await requireUser(req, env), b = await readJson(req)
    const name = oneLine(clean(b.name, 80)), phone = clean(b.phone, 20)
    if (phone && !isPhone(phone)) throw new HttpError(422, 'Please enter a valid phone number.')
    await env.DB.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').bind(name || u.name, phone || u.phone, u.id).run()
    return json(200, { user: publicUser({ ...u, name: name || u.name, phone: phone || u.phone }) })
  }
  if (path === '/bookings' && method === 'POST') return createBooking(req, env)
  if (path === '/bookings/mine' && method === 'GET') {
    const u = await requireUser(req, env)
    const { results } = await env.DB.prepare(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.date DESC`).bind(u.id).all()
    return json(200, { bookings: results.map((b) => ({ ...b, pa_notes: undefined })), slots: SLOTS })
  }
  const cancel = /^\/bookings\/(BZB-[A-Z0-9]{6})\/cancel$/.exec(path)
  if (cancel && method === 'POST') {
    const u = await requireUser(req, env)
    const r = await env.DB.prepare(`UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE ref = ? AND user_id = ? AND status = 'pending'`).bind(nowSql(), cancel[1], u.id).run()
    if (!r.meta.changes) throw new HttpError(409, 'Only pending requests can be cancelled here. For a confirmed shoot, please contact us.')
    const s = await getSettings(env)
    await sendMail(env, { to: (s.pa_emails ?? '').split(','), subject: `Booking request cancelled by the client (${cancel[1]})`, html: layout('A request was cancelled', p(`${esc(u.name || u.email)} cancelled booking request ${cancel[1]}. The slot is open again.`)), text: `${u.email} cancelled ${cancel[1]}.` })
    return json(200, { ok: true })
  }
  if (path === '/applications' && method === 'POST') return createApplication(req, env)
  if (path === '/applications/mine' && method === 'GET') {
    const u = await requireUser(req, env)
    const { results } = await env.DB.prepare('SELECT ref, full_name, city, status, created_at, updated_at FROM applications WHERE user_id = ? ORDER BY created_at DESC').bind(u.id).all()
    return json(200, { applications: results })
  }
  if (path.startsWith('/admin/')) return admin(req, env, path, url)
  throw new HttpError(404, 'Not found')
}

// Daily at 05:00 UTC (07:00 in SA): tidy expired data and send the PA a morning digest if anything is waiting.
async function daily(env: Env) {
  const now = nowSql()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM otp_codes WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM rate_events WHERE created_at < ?').bind(nowSql(new Date(Date.now() - 2 * 86400_000))),
  ])
  const today = todaySA()
  const [pending, apps, todays] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE status = 'pending'`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) n FROM applications WHERE status = 'new'`).first<{ n: number }>(),
    env.DB.prepare(`${BOOKING_SELECT} WHERE b.date = ? AND b.status = 'confirmed' ORDER BY b.slot`).bind(today).all<Record<string, string>>(),
  ])
  if (!pending?.n && !apps?.n && !todays.results.length) return
  const s = await getSettings(env)
  await sendMail(env, {
    to: (s.pa_emails ?? '').split(','), subject: `BANZA today: ${pending?.n ?? 0} booking requests, ${apps?.n ?? 0} new applications`,
    html: layout('Good morning', rows([['Booking requests waiting', String(pending?.n ?? 0)], ['New model applications', String(apps?.n ?? 0)], ['Confirmed shoots today', String(todays.results.length)]])
      + todays.results.map((b) => p(`<b>${esc(slotLabel(b.slot!))}</b>: ${esc(b.shoot!)} for ${esc(b.client_name || b.client_email!)} at ${esc(b.location!)}`)).join(''), { href: `${env.SITE_URL}/admin/`, label: 'Open the dashboard' }),
    text: `BANZA today: ${pending?.n} booking requests, ${apps?.n} new applications, ${todays.results.length} shoots today.`,
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const ch = cors(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch })
    try {
      const res = await route(req, env)
      for (const [k, v] of Object.entries(ch)) res.headers.set(k, v)
      return res
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message }, ch)
      console.error('[api] unhandled', e instanceof Error ? e.stack : e)
      return json(500, { error: 'Something went wrong on our side. Please try again.' }, ch)
    }
  },
  async scheduled(_c: ScheduledController, env: Env, ctx: ExecutionContext) { ctx.waitUntil(daily(env)) },
}
