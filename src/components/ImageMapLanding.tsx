'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface Hotspot {
  id: string
  href: string
  external?: boolean
  label: string
  top: string
  left: string
  width: string
  height: string
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'stage',
    href: '/worlds/stage',
    label: 'The Stage',
    top: '12%',
    left: '5%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'showreel',
    href: '/worlds/showreel',
    label: 'The Showreel',
    top: '42%',
    left: '5%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'gym',
    href: 'https://gym-and-tonic.vercel.app/',
    external: true,
    label: 'Gym & Tonik',
    top: '12%',
    left: '60%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'kevin11',
    href: '/worlds/kevin11',
    label: 'Kevin11',
    top: '42%',
    left: '60%',
    width: '35%',
    height: '28%',
  },
  {
    id: 'studio',
    href: '/worlds/studio',
    label: 'The Studio',
    top: '72%',
    left: '5%',
    width: '35%',
    height: '25%',
  },
  {
    id: 'connect',
    href: '/worlds/connect',
    label: 'Connect',
    top: '72%',
    left: '60%',
    width: '35%',
    height: '25%',
  },
]

export default function ImageMapLanding() {
  useEffect(() => {
    document.documentElement.classList.add('landing-lock')
    return () => document.documentElement.classList.remove('landing-lock')
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Brand lockup — top center */}
      <div
        aria-label="Welcome to the world of Kevin Fraser. Explore. Laugh. Move. Connect."
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(10px, 1.2vw, 13px)',
            letterSpacing: '0.18em',
            lineHeight: 1,
            color: '#C4A35A',
          }}
        >
          Welcome to the World of
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 'clamp(28px, 5vw, 52px)',
            letterSpacing: '0.02em',
            lineHeight: 0.9,
            color: '#F2F0EB',
          }}
        >
          Kevin Fraser
        </p>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 'clamp(10px, 1.3vw, 14px)',
            letterSpacing: '0.16em',
            lineHeight: 1,
            color: '#FFFFFF',
          }}
        >
          Explore. Laugh. Move. Connect.
        </p>
        <svg
          width="180"
          height="10"
          viewBox="0 0 180 10"
          fill="none"
          aria-hidden="true"
          style={{ marginTop: '6px', width: 'clamp(70px, 10vw, 120px)', height: 'auto' }}
        >
          <path
            d="M2 6.5 C40 2.5, 140 2.5, 178 6.5"
            stroke="#C4A35A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Click-through hotspots only — no hover videos */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        {HOTSPOTS.map((spot) => {
          const zone = (
            <div
              className="absolute cursor-pointer"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
              }}
              aria-label={spot.label}
            />
          )

          if (spot.external) {
            return (
              <a
                key={spot.id}
                href={spot.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'contents' }}
              >
                {zone}
              </a>
            )
          }

          return (
            <Link key={spot.id} href={spot.href} style={{ display: 'contents' }}>
              {zone}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
