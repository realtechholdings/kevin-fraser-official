'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'

export default function Kevin11VideoPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('landing-lock')
    return () => document.documentElement.classList.remove('landing-lock')
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
        // Browsers often block autoplay with sound — fall back to tap-to-start.
        setNeedsTap(true)
      }
    }

    void tryPlay()
  }, [])

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
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/45"
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
        style={{ top: 'max(1rem, env(safe-area-inset-top))', left: 'max(1rem, env(safe-area-inset-left))' }}
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
    </div>
  )
}
