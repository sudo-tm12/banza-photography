import type { Metadata } from 'next'
import { AdminApp } from '@/components/admin'

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false, follow: false } }

export default function AdminPage() {
  return <section className="px-5 pb-10 pt-28 sm:pt-32"><AdminApp /></section>
}
