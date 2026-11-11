import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="flex min-h-[80svh] items-center px-5 pt-24">
      <div className="glass refract mx-auto max-w-lg rounded-[32px] p-8 text-center">
        <p className="font-display text-6xl chrome-text">404</p>
        <p className="mt-4 font-serif text-3xl">This frame is out of focus.</p>
        <p className="mt-2 text-chrome-2">The page you’re looking for isn’t here.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn btn-primary">Back home</Link>
          <Link href="/portfolio/" className="btn btn-glass glass">See the portfolio</Link>
        </div>
      </div>
    </section>
  )
}
