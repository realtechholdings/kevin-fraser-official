'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

interface WorldPageProps {
  emoji: string
  title: string
  subtitle: string
  color: string
  neonClass: string
  description: string
  comingSoonItems?: string[]
  ctaLabel?: string
  ctaHref?: string
  worldGuide?: string
  worldGuideDesc?: string
}

export default function WorldPage({
  emoji,
  title,
  subtitle,
  color,
  neonClass,
  description,
  comingSoonItems = [],
  ctaLabel,
  ctaHref = '/',
  worldGuide,
  worldGuideDesc,
}: WorldPageProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="relative z-10 flex items-center justify-between border-b border-[var(--border)] py-4"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">Kevin Fraser</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center py-16"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl text-center"
        >
          <div className="mb-6 text-6xl" style={{ filter: `drop-shadow(0 0 18px ${color}55)` }}>
            {emoji}
          </div>

          <h1
            className={`mb-3 text-4xl font-black uppercase tracking-widest sm:text-5xl ${neonClass}`}
          >
            {title}
          </h1>

          <p className="mb-8 text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
            {subtitle}
          </p>

          <div
            className="mx-auto mb-8 h-px w-24"
            style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
          />

          <p className="mx-auto mb-6 max-w-lg text-base leading-relaxed text-[var(--foreground-muted)]">
            {description}
          </p>

          {worldGuide ? (
            <div
              className="mb-8 inline-flex flex-col items-center gap-1 rounded-2xl px-5 py-3"
              style={{
                background: `${color}14`,
                border: `1px solid ${color}33`,
              }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
                World Guide
              </span>
              <span className="text-sm font-black uppercase tracking-widest">{worldGuide}</span>
              {worldGuideDesc ? (
                <span className="mt-0.5 text-xs italic text-[var(--foreground-subtle)]">
                  {worldGuideDesc}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mx-auto max-w-md rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 text-left shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color }}>
              Coming Soon
            </div>

            {comingSoonItems.length > 0 ? (
              <ul className="space-y-3">
                {comingSoonItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--foreground-subtle)]">
                Content dropping soon. Stay tuned.
              </p>
            )}

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {ctaLabel ? (
                <Link
                  href={ctaHref}
                  className="inline-block rounded-full px-6 py-2.5 text-center text-xs font-bold uppercase tracking-widest"
                  style={{ background: color, color: 'var(--accent-contrast)' }}
                >
                  {ctaLabel}
                </Link>
              ) : null}
              <Link
                href="/"
                className="inline-block rounded-full border px-6 py-2.5 text-center text-xs font-bold uppercase tracking-widest"
                style={{
                  background: `${color}14`,
                  borderColor: `${color}44`,
                  color,
                }}
              >
                Back to All Worlds
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
