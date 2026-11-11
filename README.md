# BANZA Photography: website and booking platform

The digital home of BANZA Photography (Mr Banza): portfolio, online booking with a live calendar,
model applications with photo uploads, client accounts, and a private dashboard for Mr Banza and his PA.
Mobile-first, in BANZA's own look (black, chrome, maroon, gold) with liquid-glass surfaces.

| Part | What | Where |
|---|---|---|
| `web/` | Next.js 16 static site (Tailwind 4) | GitHub Pages: https://sudo-tm12.github.io/banza-photography/ |
| `api/` | Cloudflare Worker + D1 (database) + KV (model photos) + Resend (email) | https://banza-api.tshedzawebdev.workers.dev |

## How it works

- **Sign-in**: email + 6-digit code (no passwords). Codes are hashed, expire in 10 minutes, 5 tries, rate-limited.
  Sessions are random tokens stored hashed (30 days), sent as a bearer token (the site and API are on different origins).
- **Bookings**: shoot type → live calendar (open/limited/full days from the API) → time slot → details → request.
  A database rule makes double-booking a slot impossible. The PA gets an email; the client gets a copy.
- **Model applications**: details + 3–6 photos (shrunk on the phone before upload), 18+ only, POPIA consent.
  Photos are private in KV and only viewable by the team through signed links that expire after an hour.
- **Dashboard** (`/admin/`): overview, bookings (confirm, decline, complete, deposit received, private notes, one-tap
  WhatsApp/call/email, optional email to the client), calendar (see and block days), model applications (status
  pipeline, photos, delete on request), settings (shoot types, socials, alert emails, who has dashboard access,
  booking rules). Dashboard access: `banzaphotography@gmail.com` (+ any emails added in settings).
- **Daily digest**: 07:00 SA time, the PA gets a summary of anything waiting and the day's confirmed shoots.

## Commands

| | |
|---|---|
| `cd web && npm install && npm run dev` | website locally (set `NEXT_PUBLIC_API_BASE=http://127.0.0.1:4790`) |
| `cd web && npm run images` | rebuild the web images from the originals in `../../banza photography` |
| `cd api && npm install && cp .dev.vars.example .dev.vars && npm run db:local && npm run dev` | API locally (emails go to the `outbox` table) |
| `cd api && node test-e2e.mjs` | end-to-end API test against the local API |
| `cd api && npm run db:remote && npm run deploy` | deploy the API |
| push to `main` | GitHub Actions builds the site and publishes it to Pages |

API secrets (set once with `npx wrangler secret put <NAME>` in `api/`; never in the repo): `RESEND_API_KEY`,
`IP_SALT`, `SIGNING_SECRET`.

## Connecting BANZA's own domain later

1. Point the domain at GitHub Pages (Settings → Pages → Custom domain), add `web/public/CNAME`.
2. In `.github/workflows/pages.yml` set `BASE_PATH: ''` and `SITE_URL` to the domain.
3. In `api/wrangler.toml` add the domain to `ALLOWED_ORIGINS`, update `SITE_URL`, optionally add
   `routes = [{ pattern = "api.<domain>", custom_domain = true }]` (and update `API_BASE` in the workflow).
4. Verify the domain in Resend and change `MAIL_FROM` to e.g. `BANZA Photography <hello@<domain>>`.
