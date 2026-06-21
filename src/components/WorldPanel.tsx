'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface WorldPanelProps {
  id: string
  title: string
  subtitle: string
  color: string
  href: string
  external?: boolean
  videoSrc?: string
  imageSrc?: string
  delay?: number
  flickerStyle?: 'slow' | 'fast' | 'breathe'
  /** Gradient overlay direction for this panel */
  gradientDir?: string
}

// Per-world placeholder gradient backgrounds (until real images/videos are provided)
const WORLD_BG: Record<string, string> = {
  stage:    'linear-gradient(160deg, #1a0900 0%, #2d0f00 40%, #0a0500 100%)',
  showreel: 'linear-gradient(160deg, #000d1a 0%, #001628 40%, #000509 100%)',
  studio:   'linear-gradient(160deg, #0e0018 0%, #1a0030 40%, #080010 100%)',
  gym:      'linear-gradient(160deg, #001818 0%, #002828 40%, #000a0a 100%)',
  kevin11:  'linear-gradient(160deg, #1a0009 0%, #2d0014 40%, #0a0005 100%)',
  connect:  'linear-gradient(160deg, #0d0018 0%, #180030 40%, #06000a 100%)',
}

export default function WorldPanel({
  id,
  title,
  subtitle,
  color,
  href,
  external = false,
  videoSrc,
  imageSrc,
  delay = 0,
  flickerStyle = 'slow',
}: WorldPanelProps) {
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const flickerAnimation = {
    slow: 'neon-flicker 3s linear infinite',
    fast: 'neon-flicker-fast 1.5s linear infinite',
    breathe: 'neon-breathe 2.5s ease-in-out infinite',
  }[flickerStyle]

  const handleEnter = useCallback(() => {
    setHovered(true)
    if (videoRef.current && videoSrc) {
      videoRef.current.play().catch(() => {})
    }
  }, [videoSrc])

  const handleLeave = useCallback(() => {
    setHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [])

  const inner = (
    <div
      className="relative w-full h-full overflow-hidden cursor-pointer group"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        animationDelay: `${delay}s`,
        animationFillMode: 'both',
      }}
    >
      {/* ── Base background ── */}
      <div
        className="absolute inset-0 transition-transform duration-700"
        style={{
          background: WORLD_BG[id] || '#0a0a0a',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
        }}
      />

      {/* ── Static image (if provided) ── */}
      {imageSrc && (
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: hovered ? 0.55 : 0.2,
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      )}

      {/* ── Video background ── */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: hovered ? 0.65 : 0 }}
        />
      )}

      {/* ── Colour wash overlay ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at center, ${color}33 0%, ${color}08 60%, transparent 80%)`,
          opacity: hovered ? 1 : 0.25,
          mixBlendMode: 'screen',
        }}
      />

      {/* ── Dark vignette so text is always readable ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)`,
          opacity: hovered ? 0.7 : 1,
        }}
      />

      {/* ── Top edge glow (hover) ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
        style={{
          background: `linear-gradient(to right, transparent, ${color}, transparent)`,
          boxShadow: `0 0 12px ${color}, 0 0 24px ${color}88`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* ── Left/right neon accent bar ── */}
      <div
        className="absolute top-8 bottom-8 left-0 w-[2px] transition-all duration-400"
        style={{
          background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
          boxShadow: `0 0 10px ${color}`,
          opacity: hovered ? 0.8 : 0,
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col justify-end h-full px-7 pb-8">
        {/* World icon / emoji hint */}
        <div
          className="text-2xl mb-3 transition-all duration-300"
          style={{
            opacity: hovered ? 1 : 0.45,
            transform: hovered ? 'translateY(0)' : 'translateY(4px)',
            filter: hovered ? `drop-shadow(0 0 8px ${color})` : 'none',
          }}
        >
          {WORLD_ICON[id]}
        </div>

        {/* Neon title */}
        <h2
          className="font-black uppercase leading-none transition-all duration-300"
          style={{
            fontSize: 'clamp(16px, 1.6vw, 26px)',
            letterSpacing: '0.1em',
            color: hovered ? color : 'rgba(255,255,255,0.75)',
            textShadow: hovered
              ? `0 0 7px ${color}, 0 0 14px ${color}, 0 0 28px ${color}88`
              : 'none',
            animation: hovered ? flickerAnimation : 'none',
          }}
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className="mt-1.5 text-[11px] tracking-[0.22em] uppercase transition-all duration-300"
          style={{
            color: hovered ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)',
            transform: hovered ? 'translateY(0)' : 'translateY(3px)',
          }}
        >
          {subtitle}
        </p>

        {/* Enter CTA */}
        <div
          className="mt-4 flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase transition-all duration-300"
          style={{
            color,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
          <span
            className="w-4 h-px"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          ENTER
        </div>
      </div>

      {/* ── Bottom neon border (always dim, glows on hover) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] transition-all duration-400"
        style={{
          background: color,
          opacity: hovered ? 0.6 : 0.08,
          boxShadow: hovered ? `0 0 8px ${color}` : 'none',
        }}
      />
    </div>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className="block w-full h-full">
      {inner}
    </Link>
  )
}

const WORLD_ICON: Record<string, string> = {
  stage:    '🎭',
  showreel: '🎬',
  studio:   '🎵',
  gym:      '💪',
  kevin11:  '🔴',
  connect:  '🌐',
}
