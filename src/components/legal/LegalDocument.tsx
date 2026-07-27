'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/privacy', label: 'Privacy Statement' },
] as const

export default function LegalDocument({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            <span
              className="text-xs uppercase tracking-[0.22em]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Kevin Fraser
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-3xl pb-24 pt-10 sm:pt-14"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: '#0f766e' }}>
          Legal
        </p>
        <h1
          className="text-5xl uppercase leading-[0.92] sm:text-6xl"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 text-sm text-[var(--foreground-muted)]">{subtitle}</p>
        ) : null}

        <nav className="mt-8 flex flex-wrap gap-2 border-b border-[var(--border)] pb-6">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className="legal-prose mt-10 space-y-8 text-[15px] leading-relaxed text-[var(--foreground-muted)]">
          {children}
        </article>

        <p className="mt-14 text-xs text-[var(--foreground-subtle)]">
          Questions?{' '}
          <a className="underline hover:text-[var(--foreground)]" href="mailto:letsplay@creamkulture.com">
            letsplay@creamkulture.com
          </a>
        </p>
      </main>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-xl uppercase tracking-wide text-[var(--foreground)]"
        style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
