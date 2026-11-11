// End-to-end test against the local API (wrangler dev --local, MAIL_TRANSPORT=outbox).
import { execSync } from 'node:child_process'
const API = 'http://localhost:4790', ORIGIN = 'http://localhost:4791'
const j = async (path, opts = {}, token) => {
  const headers = { Origin: ORIGIN, ...(opts.json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const r = await fetch(API + path, { method: opts.method ?? (opts.json || opts.body ? 'POST' : 'GET'), headers, body: opts.json ? JSON.stringify(opts.json) : opts.body })
  return { status: r.status, data: await r.json().catch(() => ({})), cors: r.headers.get('access-control-allow-origin') }
}
const lastCode = (email) => {
  const out = execSync(`npx wrangler d1 execute banza --local --json --command "SELECT subject FROM outbox WHERE to_addr = '${email}' ORDER BY id DESC LIMIT 1"`, { encoding: 'utf8' })
  return /(\d{6}) is your/.exec(out)?.[1]
}
const signIn = async (email, name) => {
  const s = await j('/auth/start', { json: { email } })
  if (s.status !== 200) throw new Error('start ' + JSON.stringify(s))
  const code = lastCode(email)
  const bad = await j('/auth/verify', { json: { email, code: '000000' === code ? '111111' : '000000', name } })
  const v = await j('/auth/verify', { json: { email, code, name } })
  console.log(`sign-in ${email}: wrong code → ${bad.status}, right code → ${v.status} role=${v.data.user?.role} cors=${s.cors}`)
  return v.data.token
}
const ok = (c, msg) => console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`)

const client = await signIn('thandi.test@example.com', 'Thandi Mokoena')
const avail = (await j(`/availability?month=2026-11`)).data
const open = Object.entries(avail.days).find(([, d]) => d.status === 'open')
ok(!!open, `availability has open days (first: ${open?.[0]}, today ${avail.today})`)
const book = { shootType: 'portrait', date: open[0], slot: 'golden', location: 'Hatfield, Pretoria', distanceBand: '5-10', people: 2, phone: '071 234 5678', notes: 'Graduation portraits please', name: 'Thandi Mokoena' }
const b1 = await j('/bookings', { json: book }, client)
ok(b1.status === 201 && /^BZB-/.test(b1.data.ref), `booking created ${b1.data.ref ?? JSON.stringify(b1.data)}`)
const b2 = await j('/bookings', { json: book }, client)
ok(b2.status === 409, `same slot again refused (${b2.status}: ${b2.data.error})`)
const day = (await j(`/availability?month=2026-11`)).data.days[open[0]]
ok(!day.free.includes('golden'), `slot now shows as taken (free: ${day.free.join(',')})`)
const noauth = await j('/bookings', { json: book })
ok(noauth.status === 401, `booking without sign-in refused (${noauth.status})`)
const mine = await j('/bookings/mine', {}, client)
ok(mine.data.bookings?.length === 1 && mine.data.bookings[0].pa_notes === undefined, 'client sees own booking, without team notes')

// model application with 3 tiny JPEGs
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
const fd = new FormData()
Object.entries({ fullName: 'Lerato Khumalo', dob: '2001-05-14', gender: 'Female', height: '172', city: 'Sunnyside', phone: '082 555 1234', social: '@lerato', experience: 'some', interests: 'Fashion, Beauty', intro: 'I love fashion photography and have done two shoots before.', consent: 'yes' }).forEach(([k, v]) => fd.append(k, v))
for (let i = 0; i < 3; i++) fd.append('photos', new Blob([jpeg], { type: 'image/jpeg' }), `p${i}.jpg`)
const a1 = await j('/applications', { body: fd }, client)
ok(a1.status === 201 && /^BZM-/.test(a1.data.ref), `application created ${a1.data.ref ?? JSON.stringify(a1.data)}`)
const fd2 = new FormData(); Object.entries({ fullName: 'Too Young', dob: '2012-01-01', city: 'X', phone: '082 555 1234', experience: 'none', intro: 'I would like to model with BANZA one day soon.', consent: 'yes' }).forEach(([k, v]) => fd2.append(k, v))
for (let i = 0; i < 3; i++) fd2.append('photos', new Blob([jpeg], { type: 'image/jpeg' }), `p${i}.jpg`)
const a2 = await j('/applications', { body: fd2 }, client)
ok(a2.status === 422, `under-18 refused (${a2.data.error})`)

const forbidden = await j('/admin/summary', {}, client)
ok(forbidden.status === 403, `client can't open the dashboard (${forbidden.status})`)
const admin = await signIn('banzaphotography@gmail.com', '')
const sum = await j('/admin/summary', {}, admin)
ok(sum.status === 200 && sum.data.pending === 1 && sum.data.newApplications === 1, `admin summary: ${sum.data.pending} pending, ${sum.data.newApplications} new applications`)
const list = await j('/admin/bookings?status=pending', {}, admin)
const id = list.data.bookings[0].id
const conf = await j(`/admin/bookings/${id}`, { method: 'PATCH', json: { status: 'confirmed', notify: true, message: 'Your quote is R800 for 2 hours.' } }, admin)
ok(conf.status === 200, 'admin confirmed the booking (client emailed)')
const apps = await j('/admin/applications?status=new', {}, admin)
const url = apps.data.applications[0].photo_urls[0]
const ph = await fetch(url)
ok(ph.status === 200 && ph.headers.get('content-type') === 'image/jpeg', `signed photo link works (${ph.status})`)
const tampered = await fetch(url.replace(/sig=[a-f0-9]{4}/, 'sig=0000'))
ok(tampered.status === 403, `tampered photo link refused (${tampered.status})`)
const subjects = execSync(`npx wrangler d1 execute banza --local --json --command "SELECT to_addr, subject FROM outbox ORDER BY id"`, { encoding: 'utf8' })
console.log('\nEmails sent:'); for (const r of JSON.parse(subjects)[0].results) console.log(`  → ${r.to_addr}: ${r.subject}`)
