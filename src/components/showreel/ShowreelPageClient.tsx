'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ExternalLink,
  Play,
  X,
} from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import type { ShowreelItem } from '@/lib/showreel/feeds'

type Tab = 'youtube' | 'instagram' | 'facebook'

type FeedPayload = {
  success: boolean
  sources: {
    youtube: { profile: string; items: ShowreelItem[] }
    instagram: { profile: string; items: ShowreelItem[] }
    facebook: { profile: string; items: ShowreelItem[] }
  }
  errors?: Record<string, string>
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
]

function youtubeEmbed(url: string) {
  const short = url.match(/\/shorts\/([A-Za-z0-9_-]+)/)?.[1]
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]+)/)?.[1]
  const id = short || watch
  if (!id) return null
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
}

function instagramEmbed(url: string) {
  const clean = url.split('?')[0].replace(/\/$/, '')
  return `${clean}/embed`
}

export default function ShowreelPageClient() {
  const [tab, setTab] = useState<Tab>('youtube')
  const [data, setData] = useState<FeedPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<ShowreelItem | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/showreel')
        const json = (await res.json()) as FeedPayload
        if (!res.ok || !json.success) throw new Error('Failed to load showreel')
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load showreel')
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

  const items = useMemo(() => {
    if (!data) return []
    return data.sources[tab].items
  }, [data, tab])

  const profile = data?.sources[tab].profile

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
              The Showreel
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
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: '#2f6fed' }}>
            Clips · Reels · Shorts
          </p>
          <h1
            className="text-5xl uppercase leading-[0.92] sm:text-7xl"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            The Showreel
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
            Latest shorts and posts from Kevin&apos;s YouTube, Instagram, and Facebook — pulled live
            from his channels.
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
          {profile ? (
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Open profile <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>

        {error ? (
          <div
            className="mb-6 rounded-2xl border px-5 py-4 text-sm"
            style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            {error}
          </div>
        ) : null}

        {data?.errors?.[tab] ? (
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--foreground-muted)]">
            Couldn&apos;t refresh {tab} right now: {data.errors[tab]}
          </div>
        ) : null}

        {tab === 'facebook' ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
              <div className="overflow-hidden rounded-xl bg-white">
                <iframe
                  title="Kevin Fraser Facebook"
                  src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fkevinfraserofficial&tabs=timeline&width=500&height=760&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true"
                  width="100%"
                  height="760"
                  style={{ border: 'none', overflow: 'hidden', display: 'block' }}
                  scrolling="no"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-7">
              <h2 className="text-xl font-semibold">Follow on Facebook</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
                Live timeline from{' '}
                <a
                  href="https://www.facebook.com/kevinfraserofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  facebook.com/kevinfraserofficial
                </a>
                . Facebook doesn&apos;t publish a public reel feed without a Meta app token, so this
                embeds the official page plugin instead of a scraped grid.
              </p>
              <a
                href="https://www.facebook.com/kevinfraserofficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                Open Facebook
              </a>
            </div>
          </div>
        ) : loading ? (
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
            No {tab} clips available right now.
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
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--foreground-subtle)]">
                      {item.source}
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
                      {item.kind}
                      {item.views ? ` · ${item.views.toLocaleString()} views` : ''}
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

              {active.source === 'youtube' && youtubeEmbed(active.url) ? (
                <div className="aspect-video w-full">
                  <iframe
                    title={active.title}
                    src={youtubeEmbed(active.url)!}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : active.source === 'instagram' ? (
                <div className="min-h-[70vh] w-full bg-black">
                  <iframe
                    title={active.title}
                    src={instagramEmbed(active.url)}
                    className="h-[70vh] w-full"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-white">
                  <p className="mb-4">{active.title}</p>
                  <a
                    href={active.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
                  >
                    Open on {active.source}
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
