'use client'
// Public settings managed from the admin dashboard (shoot types, socials, booking rules), with
// built-in defaults so pages render instantly and still work if the API is unreachable.
import { useEffect, useState } from 'react'
import { api } from './api'
import { SITE } from './site'

export type ShootType = { id: number; slug: string; name: string; description: string; duration: string; price_note: string; active: number; sort: number }
export type Slot = { id: string; label: string; time: string }
export type PublicConfig = {
  shootTypes: ShootType[]
  slots: Slot[]
  socials: { instagram: string; tiktok: string; facebook: string; whatsapp: string }
  leadDays: number
  windowDays: number
}

export const DEFAULT_CONFIG: PublicConfig = {
  shootTypes: [
    { id: 1, slug: 'portrait', name: 'Portrait shoot', description: 'Personal, professional or creative portraits.', duration: '1–2 hours', price_note: 'Hourly rate, quoted on confirmation', active: 1, sort: 1 },
    { id: 2, slug: 'birthday', name: 'Birthday party', description: 'Coverage of your celebration, from setup to cake.', duration: '2–4 hours', price_note: 'Hourly rate, quoted on confirmation', active: 1, sort: 2 },
    { id: 3, slug: 'event', name: 'Event', description: 'Matric farewells, functions and gatherings.', duration: '2–6 hours', price_note: 'Hourly rate, quoted on confirmation', active: 1, sort: 3 },
    { id: 4, slug: 'graduation', name: 'Graduation', description: 'Graduation portraits and ceremonies, gowns and caps available.', duration: '1–3 hours', price_note: 'Quoted on confirmation', active: 1, sort: 4 },
  ],
  slots: [
    { id: 'morning', label: 'Morning', time: '08:00 – 11:00' },
    { id: 'midday', label: 'Midday', time: '11:00 – 14:00' },
    { id: 'afternoon', label: 'Afternoon', time: '14:00 – 17:00' },
    { id: 'golden', label: 'Golden hour', time: '17:00 – 19:00' },
    { id: 'evening', label: 'Evening', time: '19:00 – 22:00' },
  ],
  socials: { instagram: SITE.instagram, tiktok: '', facebook: '', whatsapp: '' },
  leadDays: 2,
  windowDays: 120,
}

let cache: PublicConfig | null = null
export function usePublicConfig() {
  const [cfg, setCfg] = useState<PublicConfig>(cache ?? DEFAULT_CONFIG)
  useEffect(() => {
    if (cache) return
    api<PublicConfig>('/public/config').then((c) => { cache = c; setCfg(c) }).catch(() => { /* keep defaults */ })
  }, [])
  return cfg
}
