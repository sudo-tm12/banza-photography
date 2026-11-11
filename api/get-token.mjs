// Prints a session token for an email (local API + outbox only).
import { execSync } from 'node:child_process'
const [email, name = ''] = process.argv.slice(2)
const API = 'http://127.0.0.1:4790'
await fetch(API + '/auth/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
const out = execSync(`npx wrangler d1 execute banza --local --json --command "SELECT subject FROM outbox WHERE to_addr = '${email}' ORDER BY id DESC LIMIT 1"`, { encoding: 'utf8' })
const code = /(\d{6}) is your/.exec(out)[1]
const v = await (await fetch(API + '/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, name }) })).json()
process.stdout.write(v.token)
