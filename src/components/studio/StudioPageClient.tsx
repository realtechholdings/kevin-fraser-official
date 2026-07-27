'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Play, X } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import type { PublicStudioContent } from '@/lib/serialize'
import {
  STUDIO_CATEGORIES,
  STUDIO_CATEGORY_LABELS,
  type StudioCategory,
} from '@/lib/studio/categories'

type StudioPayload = {
  success: boolean
  byCategory: Record<StudioCategory, PublicStudioContent[]>
  error?: string
}

const TABS = STUDIO_CATEGORIES.map((id) => ({
  id,
  label: STUDIO_CATEGORY_LABELS[id],
}))

export default function StudioPageClient() {
  const [tab, setTab] = useState<StudioCategory>('behind_the_scenes')
  const [data, setData] = useState<StudioPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<PublicStudioContent | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/studio')
        const json = (await res.json()) as StudioPayload
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load studio')
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load studio')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const items = useMemo(() => data?.byCategory?.[tab] || [], [data, tab])

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between py-4">
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
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-[var(--foreground-subtle)] sm:inline">
              The Studio
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-6xl pb-24 pt-10 sm:pt-14"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10"
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: '#FF0080' }}>
            Behind the scenes · Characters · Process
          </p>
          <h1
            className="text-5xl uppercase leading-[0.92] sm:text-7xl"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            The Studio
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
            Exclusive clips from inside Kevin&apos;s creative world — how the work gets made, who
            lives in it, and what happens off stage.
          </p>
        </motion.section>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const activeTab = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: activeTab ? 'var(--foreground)' : 'var(--surface)',
                  color: activeTab ? 'var(--background)' : 'var(--foreground-muted)',
                  border: `1px solid ${activeTab ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {error ? (
          <div
            className="mb-6 rounded-2xl border px-5 py-4 text-sm"
            style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[9/14] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center text-[var(--foreground-muted)]">
            No {STUDIO_CATEGORY_LABELS[tab].toLowerCase()} videos yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => setActive(item)}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left"
              >
                <div className="relative aspect-[9/14] overflow-hidden bg-[var(--surface-muted)]">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#2a0018] to-[#080010] text-sm text-white/60">
                      Studio
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
                      <Play className="h-5 w-5 fill-current" />
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
                      {STUDIO_CATEGORY_LABELS[item.category]}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {active ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="bg-black">
                {active.mimeType?.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.mediaUrl}
                    alt={active.title}
                    className="max-h-[80vh] w-full object-contain"
                  />
                ) : (
                  <video
                    src={active.mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[80vh] w-full"
                    poster={active.thumbnailUrl || undefined}
                  />
                )}
                <div className="border-t border-white/10 px-5 py-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                    {STUDIO_CATEGORY_LABELS[active.category]}
                  </p>
                  <p className="mt-1 font-medium">{active.title}</p>
                  {active.description ? (
                    <p className="mt-1 text-sm text-white/60">{active.description}</p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
