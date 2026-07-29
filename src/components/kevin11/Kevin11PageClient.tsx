'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Play, Volume2, VolumeX, X } from 'lucide-react'
import type { PublicKevin11Content } from '@/lib/serialize'
import {
  KEVIN11_CATEGORY_LABELS,
  type Kevin11Category,
} from '@/lib/kevin11/categories'

type Kevin11Payload = {
  success: boolean
  overlays: {
    left: PublicKevin11Content[]
    right: PublicKevin11Content[]
  }
  error?: string
}

function OverlayCard({
  item,
  onOpen,
}: {
  item: PublicKevin11Content
  onOpen: (item: PublicKevin11Content) => void
}) {
  const thumb = item.thumbnailUrl || (item.mimeType.startsWith('image/') ? item.mediaUrl : '')
  const hasCta = Boolean(item.ctaLabel && item.ctaUrl)

  return (
    <div className="w-[6.75rem] shrink-0 sm:w-[8.5rem] md:w-[9.5rem]">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group relative w-full overflow-hidden rounded-2xl border border-white/25 bg-black/50 text-left shadow-xl backdrop-blur-md transition hover:bg-black/65"
      >
        <div className="relative aspect-[9/14] overflow-hidden bg-black/40">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0a3d2a] to-[#1a0a00] text-white/70">
              <Play className="h-7 w-7 fill-current" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
            <p className="line-clamp-2 text-xs font-medium text-white sm:text-sm">{item.title}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/70 sm:text-[10px]">
              {KEVIN11_CATEGORY_LABELS[item.category as Kevin11Category]}
            </p>
          </div>
        </div>
      </button>
      {hasCta ? (
        <a
          href={item.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FF6600] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-md transition hover:brightness-110 sm:text-[10px]"
        >
          {item.ctaLabel}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  )
}

function OverlayRow({
  items,
  side,
  onOpen,
}: {
  items: PublicKevin11Content[]
  side: 'left' | 'right'
  onOpen: (item: PublicKevin11Content) => void
}) {
  if (!items.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute z-20 flex max-w-[46%] flex-row flex-nowrap items-start gap-2 overflow-x-auto sm:gap-3 ${
        side === 'left'
          ? 'left-[2.5%] justify-start sm:left-[5%]'
          : 'right-[2.5%] justify-end sm:right-[5%]'
      }`}
      style={{
        top: 'max(4.75rem, calc(env(safe-area-inset-top) + 3.75rem))',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((item) => (
        <OverlayCard key={item.id} item={item} onOpen={onOpen} />
      ))}
    </motion.div>
  )
}

export default function Kevin11PageClient() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const [leftItems, setLeftItems] = useState<PublicKevin11Content[]>([])
  const [rightItems, setRightItems] = useState<PublicKevin11Content[]>([])
  const [active, setActive] = useState<PublicKevin11Content | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('landing-lock')
    return () => document.documentElement.classList.remove('landing-lock')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/kevin11')
        const json = (await res.json()) as Kevin11Payload
        if (!res.ok || !json.success) return
        if (!cancelled) {
          setLeftItems(json.overlays?.left || [])
          setRightItems(json.overlays?.right || [])
        }
      } catch {
        // Video still plays if content fails to load.
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
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

      <OverlayRow items={leftItems} side="left" onOpen={setActive} />
      <OverlayRow items={rightItems} side="right" onOpen={setActive} />

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
