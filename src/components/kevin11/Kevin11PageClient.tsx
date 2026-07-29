'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Play, Volume2, VolumeX, X } from 'lucide-react'
import type { PublicKevin11Content } from '@/lib/serialize'
import {
  KEVIN11_CATEGORIES,
  KEVIN11_CATEGORY_LABELS,
  type Kevin11Category,
} from '@/lib/kevin11/categories'

type Kevin11Payload = {
  success: boolean
  items: PublicKevin11Content[]
  byCategory: Record<Kevin11Category, PublicKevin11Content[]>
  overlays: {
    left: PublicKevin11Content | null
    right: PublicKevin11Content | null
  }
  error?: string
}

function OverlayCard({
  item,
  side,
  onOpen,
}: {
  item: PublicKevin11Content
  side: 'left' | 'right'
  onOpen: (item: PublicKevin11Content) => void
}) {
  const thumb = item.thumbnailUrl || (item.mimeType.startsWith('image/') ? item.mediaUrl : '')
  const hasCta = Boolean(item.ctaLabel && item.ctaUrl)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute z-20 w-[min(42vw,11.5rem)] sm:w-[13rem] ${
        side === 'left' ? 'left-[3%] sm:left-[6%]' : 'right-[3%] sm:right-[6%]'
      }`}
      style={{ top: 'max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))' }}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group w-full overflow-hidden rounded-xl border border-white/25 bg-black/55 text-left shadow-lg backdrop-blur-md transition hover:bg-black/70"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0a3d2a] to-[#1a0a00] text-white/70">
              <Play className="h-6 w-6 fill-current" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="line-clamp-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white sm:text-xs">
              {item.title}
            </p>
          </div>
        </div>
      </button>
      {hasCta ? (
        <a
          href={item.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/25 bg-[#FF6600] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-md transition hover:brightness-110"
        >
          {item.ctaLabel}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </motion.div>
  )
}

export default function Kevin11PageClient() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const [tab, setTab] = useState<Kevin11Category>('comedy')
  const [data, setData] = useState<Kevin11Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<PublicKevin11Content | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/kevin11')
        const json = (await res.json()) as Kevin11Payload
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load Kevin11')
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Kevin11')
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
    const video = videoRef.current
    if (!video) return

    video.muted = false
    video.volume = 1

    const tryPlay = async () => {
      try {
        await video.play()
        setNeedsTap(false)
        setMuted(false)
      } catch {
        setNeedsTap(true)
      }
    }

    void tryPlay()
  }, [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  async function startWithAudio() {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    video.volume = 1
    setMuted(false)
    try {
      await video.play()
      setNeedsTap(false)
    } catch {
      setNeedsTap(true)
    }
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setMuted(next)
    if (!next && video.paused) {
      void video.play()
    }
  }

  const visibleTabs = useMemo(() => {
    // Comedy always shows; merch/other only when they have published items.
    return KEVIN11_CATEGORIES.filter((id) => {
      if (id === 'comedy') return true
      return (data?.byCategory?.[id]?.length || 0) > 0
    }).map((id) => ({ id, label: KEVIN11_CATEGORY_LABELS[id] }))
  }, [data])

  const items = useMemo(() => data?.byCategory?.[tab] || [], [data, tab])
  const leftOverlay = data?.overlays?.left || null
  const rightOverlay = data?.overlays?.right || null
  const showBrowseCue = Boolean(leftOverlay || rightOverlay || (data?.items?.length || 0) > 0)

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab('comedy')
    }
  }, [visibleTabs, tab])

  return (
    <div className="min-h-screen overflow-y-auto bg-black text-white">
      <section className="relative h-[100dvh] w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src="/kevin-11-web.mp4"
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          loop
          autoPlay
          preload="auto"
          onClick={() => {
            if (needsTap) void startWithAudio()
          }}
        />

        {needsTap ? (
          <button
            type="button"
            onClick={() => void startWithAudio()}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/45"
            aria-label="Play Kevin11 video with sound"
          >
            <span
              className="rounded-full border border-white/30 bg-black/50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Tap to play
            </span>
          </button>
        ) : null}

        <Link
          href="/"
          className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-2 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          style={{
            top: 'max(1rem, env(safe-area-inset-top))',
            left: 'max(1rem, env(safe-area-inset-left))',
          }}
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
          <span
            className="text-[11px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            Back
          </span>
        </Link>

        {leftOverlay ? (
          <OverlayCard item={leftOverlay} side="left" onOpen={setActive} />
        ) : null}
        {rightOverlay ? (
          <OverlayCard item={rightOverlay} side="right" onOpen={setActive} />
        ) : null}

        <button
          type="button"
          onClick={toggleMute}
          className="absolute z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          style={{
            right: 'max(1rem, env(safe-area-inset-right))',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {showBrowseCue ? (
          <a
            href="#kevin11-store"
            className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/25 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm"
            style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            Browse store
          </a>
        ) : null}
      </section>

      <section
        id="kevin11-store"
        className="relative border-t border-white/10 bg-[var(--background)] text-[var(--foreground)]"
      >
        <main
          className="mx-auto w-full max-w-6xl pb-24 pt-10 sm:pt-14"
          style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
        >
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10"
          >
            <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: '#FF6600' }}>
              Comedy · Merch · More
            </p>
            <h1
              className="text-5xl uppercase leading-[0.92] sm:text-7xl"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Kevin11
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
              Inside the inconvenience store — clips, merch drops, and whatever else Kevin stocks
              the shelves with.
            </p>
          </motion.section>

          <div className="mb-8 flex flex-wrap items-center gap-2">
            {visibleTabs.map((t) => {
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
              style={{
                borderColor: 'var(--danger)',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
              }}
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
              No {KEVIN11_CATEGORY_LABELS[tab].toLowerCase()} yet — check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((item, index) => {
                const thumb =
                  item.thumbnailUrl || (item.mimeType.startsWith('image/') ? item.mediaUrl : '')
                return (
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
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0a3d2a] to-[#1a0a00] text-sm text-white/60">
                          Kevin11
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
                          {KEVIN11_CATEGORY_LABELS[item.category]}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </main>
      </section>

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
                    {KEVIN11_CATEGORY_LABELS[active.category]}
                  </p>
                  <p className="mt-1 font-medium">{active.title}</p>
                  {active.description ? (
                    <p className="mt-1 text-sm text-white/60">{active.description}</p>
                  ) : null}
                  {active.ctaLabel && active.ctaUrl ? (
                    <a
                      href={active.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FF6600] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                    >
                      {active.ctaLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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
