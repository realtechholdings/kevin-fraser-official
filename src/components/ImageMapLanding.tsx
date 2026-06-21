'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface Hotspot {
  id: string
  href: string
  external?: boolean
  videoSrc: string
  top: string
  left: string
  width: string
  height: string
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'stage',
    href: '/worlds/stage',
    videoSrc: '/videos/thestage.mp4',
    top: '12%',
    left: '5%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'showreel',
    href: '/worlds/showreel',
    videoSrc: '/videos/theshowreel.mp4',
    top: '42%',
    left: '5%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'gym',
    href: 'https://gym-and-tonic.vercel.app/',
    external: true,
    videoSrc: '/videos/gym%26tonic.mp4',
    top: '12%',
    left: '60%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'kevin11',
    href: '/worlds/kevin11',
    videoSrc: '/videos/kevin11.mp4',
    top: '42%',
    left: '60%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'studio',
    href: '/worlds/studio',
    videoSrc: '/videos/thestudio.mp4',
    top: '72%',
    left: '5%',
    width: '35%',
    height: '25%',
  },
  {
    id: 'connect',
    href: '/worlds/connect',
    videoSrc: '/videos/connect.mp4',
    top: '72%',
    left: '60%',
    width: '35%',
    height: '25%',
  },
]

export default function ImageMapLanding() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  const handleEnter = useCallback((id: string, videoSrc: string) => {
    setActiveVideo(videoSrc)
    const vid = videoRefs.current[id]
    if (vid) {
      vid.currentTime = 0
      vid.play().catch(() => {})
    }
  }, [])

  const handleLeave = useCallback((id: string) => {
    setActiveVideo(null)
    const vid = videoRefs.current[id]
    if (vid) {
      vid.pause()
      vid.currentTime = 0
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">

      {/* Logo — top center */}
      <img
        src="/kf-logo.png"
        alt="Kevin Fraser"
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '60px',
          width: 'auto',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />

      {/* Static hero image — always underneath */}
      <img
        src="/kevin-hero.jpeg"
        alt="Kevin Fraser World"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          userSelect: 'none',
          zIndex: 1,
        }}
        draggable={false}
      />

      {/* All 6 videos preloaded, sitting full-viewport — only the active one shows */}
      {HOTSPOTS.map(spot => (
        <video
          key={spot.id}
          ref={el => { videoRefs.current[spot.id] = el }}
          src={spot.videoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            opacity: activeVideo === spot.videoSrc ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}

      {/* Invisible hotspot zones — hover triggers full-bg video swap */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        {HOTSPOTS.map(spot => {
          const inner = (
            <div
              key={spot.id}
              className="absolute cursor-pointer"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
              }}
              onMouseEnter={() => handleEnter(spot.id, spot.videoSrc)}
              onMouseLeave={() => handleLeave(spot.id)}
            />
          )

          if (spot.external) {
            return (
              <a key={spot.id} href={spot.href} target="_blank" rel="noopener noreferrer" style={{ display: 'contents' }}>
                {inner}
              </a>
            )
          }

          return (
            <Link key={spot.id} href={spot.href} style={{ display: 'contents' }}>
              {inner}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
