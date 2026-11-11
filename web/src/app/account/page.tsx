import type { Metadata } from 'next'
import { Account } from '@/components/account'

export const metadata: Metadata = { title: 'Your account', robots: { index: false } }

export default function AccountPage() {
  return <section className="px-5 pb-10 pt-28 sm:pt-36"><Account /></section>
}
