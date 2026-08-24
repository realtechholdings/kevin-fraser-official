'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Link2, Send, X } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import {
  DEFAULT_CONNECT_SETTINGS,
  type ConnectSettings,
} from '@/lib/settings/defaults'

/**
 * Full-screen intro that plays the (black-background) contact video as an
 * overlay above the page, then fades away when it finishes.
 */
function ConnectIntro({
  onDone,
  desktopSrc,
  mobileSrc,
}: {
  onDone: () => void
  desktopSrc: string
  mobileSrc: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [fading, setFading] = useState(false)
  // null until measured on the client, so we never download the wrong video
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  function finish() {
    setFading(true)
    setTimeout(onDone, 700)
  }

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 767px)').matches)
  }, [])

  const videoSrc = isMobile ? mobileSrc : desktopSrc

  useEffect(() => {
    if (isMobile === null) return
    const video = videoRef.current
    if (!video) return

    let cancelled = false

    async function tryPlay() {
      if (cancelled || !video) return
      video.volume = 1
      try {
        video.muted = false
        await video.play()
      } catch {
        // Autoplay with sound blocked — play the intro silently instead
        try {
          video.muted = true
          await video.play()
        } catch {
          if (!cancelled) onDone()
        }
      }
    }

    function onCanPlay() {
      void tryPlay()
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void tryPlay()
    } else {
      video.addEventListener('canplay', onCanPlay, { once: true })
    }

    return () => {
      cancelled = true
      video.removeEventListener('canplay', onCanPlay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, videoSrc])

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-700 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#F3EFEA' }}
    >
      {isMobile !== null ? (
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          playsInline
          preload="auto"
          onEnded={finish}
          onError={finish}
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
        />
      ) : null}
      <button
        type="button"
        onClick={finish}
        className="absolute z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
        }}
        aria-label="Skip intro"
      >
        Skip
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function SocialIcon({ id }: { id: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: 'h-5 w-5',
    'aria-hidden': true as const,
  }

  if (id === 'facebook') {
    return (
      <svg {...common}>
        <path d="M14 8.5h2.5V5.4c-.4-.1-1.6-.2-3-.2-3 0-5 1.8-5 5.2V13H5.5v3.5H8.5V23h3.6v-6.5H15l.5-3.5h-3.4V10.8c0-1 .3-1.8 1.9-1.8Z" />
      </svg>
    )
  }
  if (id === 'instagram') {
    return (
      <svg {...common}>
        <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm5.1-8.2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.5c-2.3 0-2.6 0-3.5.1-2.3.1-3.5 1.3-3.6 3.6-.1.9-.1 1.2-.1 3.5s0 2.6.1 3.5c.1 2.3 1.3 3.5 3.6 3.6.9.1 1.2.1 3.5.1s2.6 0 3.5-.1c2.3-.1 3.5-1.3 3.6-3.6.1-.9.1-1.2.1-3.5s0-2.6-.1-3.5c-.1-2.3-1.3-3.5-3.6-3.6-.9-.1-1.2-.1-3.5-.1Zm0 1.6c2.3 0 2.5 0 3.4.1 1.7.1 2.5.9 2.6 2.6.1.9.1 1.1.1 3.4s0 2.5-.1 3.4c-.1 1.7-.9 2.5-2.6 2.6-.9.1-1.1.1-3.4.1s-2.5 0-3.4-.1c-1.7-.1-2.5-.9-2.6-2.6-.1-.9-.1-1.1-.1-3.4s0-2.5.1-3.4c.1-1.7.9-2.5 2.6-2.6.9-.1 1.1-.1 3.4-.1Z" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M19.6 8.3a6.7 6.7 0 0 1-3.9-1.2v7.1a5.7 5.7 0 1 1-4.9-5.6v2.9a2.8 2.8 0 1 0 2 2.7V2.8h2.8a3.9 3.9 0 0 0 3.9 3.9v1.6Z" />
      </svg>
    )
  }
  if (id === 'youtube') {
    return (
      <svg {...common}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.8 15.6V8.4L15.8 12l-6 3.6Z" />
      </svg>
    )
  }
  return <Link2 className="h-5 w-5" aria-hidden />
}

export default function ConnectPage() {
  const [settings, setSettings] = useState<ConnectSettings>(DEFAULT_CONNECT_SETTINGS)
  const [form, setForm] = useState({
    name: '',
    email: '',
    inquiryType: DEFAULT_CONNECT_SETTINGS.inquiryTypes[0] || 'Booking',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [introDone, setIntroDone] = useState(false)
  const [settingsReady, setSettingsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/connect/settings')
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.connect) {
          const next = data.connect as ConnectSettings
          setSettings(next)
          setForm((f) => ({
            ...f,
            inquiryType:
              next.inquiryTypes.includes(f.inquiryType)
                ? f.inquiryType
                : next.inquiryTypes[0] || f.inquiryType,
          }))
        }
      } catch {
        // Keep defaults on failure
      } finally {
        if (!cancelled) setSettingsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]'

  const defaultInquiry = settings.inquiryTypes[0] || 'Booking'
  const showIntro = settings.introEnabled !== false
  const desktopVideo =
    settings.introVideoUrl?.trim() || '/connect-intro.mp4'
  const mobileVideo =
    settings.introVideoMobileUrl?.trim() ||
    settings.introVideoUrl?.trim() ||
    '/connect-intro-mobile.mp4'

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      {showIntro && !introDone ? (
        settingsReady ? (
          <ConnectIntro
            onDone={() => setIntroDone(true)}
            desktopSrc={desktopVideo}
            mobileSrc={mobileVideo}
          />
        ) : (
          <div className="fixed inset-0 z-50" style={{ background: '#F3EFEA' }} />
        )
      ) : null}
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
              Connect
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
          className="mb-12"
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: '#0f766e' }}>
            {settings.eyebrow}
          </p>
          <h1
            className="text-5xl uppercase leading-[0.92] sm:text-7xl"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            {settings.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
            {settings.intro}
          </p>
        </motion.section>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <h2
              className="mb-2 text-2xl uppercase tracking-wide"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              {settings.socialsHeading}
            </h2>
            <p className="mb-6 text-sm text-[var(--foreground-muted)]">
              {settings.socialsIntro}
            </p>

            <ul className="space-y-3">
              {settings.socials.map((social, index) => (
                <motion.li
                  key={`${social.id}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.05 }}
                >
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition-colors hover:border-[var(--foreground)]/20"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--foreground)]"
                      style={{ background: 'var(--surface-muted, rgba(127,127,127,0.12))' }}
                    >
                      <SocialIcon id={social.id} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {social.label}
                        </span>
                        <span className="truncate text-xs text-[var(--foreground-subtle)]">
                          {social.handle}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--foreground-muted)]">
                        {social.blurb}
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[var(--foreground-subtle)] transition-colors group-hover:text-[var(--foreground)]" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-8"
          >
            {success ? (
              <div className="py-10 text-center">
                <p className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={{ color: '#0f766e' }}>
                  Sent
                </p>
                <h2
                  className="mb-3 text-3xl uppercase"
                  style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                >
                  {settings.successHeading}
                </h2>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--foreground-muted)]">
                  {settings.successBody}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setForm({ name: '', email: '', inquiryType: defaultInquiry, message: '' })
                  }}
                  className="mt-8 rounded-full border border-[var(--border)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-2">
                  <h2
                    className="text-3xl uppercase"
                    style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                  >
                    {settings.formHeading}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                    {settings.formIntro}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className={fieldClass}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className={fieldClass}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    Enquiry type
                  </label>
                  <select
                    value={form.inquiryType}
                    onChange={(e) => setForm((f) => ({ ...f, inquiryType: e.target.value }))}
                    className={fieldClass}
                  >
                    {settings.inquiryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    Message
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    required
                    rows={5}
                    className={`${fieldClass} resize-none`}
                    placeholder="Tell us what you’re after…"
                  />
                </div>

                {error ? (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.16em] disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {loading ? (
                    'Sending…'
                  ) : (
                    <>
                      <Send size={14} /> Send enquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.section>
        </div>

        <p className="mt-14 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-[var(--foreground-subtle)]">
          <Link href="/terms" className="hover:text-[var(--foreground)]">
            Terms of Service
          </Link>
          <Link href="/refund-policy" className="hover:text-[var(--foreground)]">
            Refund Policy
          </Link>
          <Link href="/privacy" className="hover:text-[var(--foreground)]">
            Privacy Statement
          </Link>
        </p>
      </main>
    </div>
  )
}
