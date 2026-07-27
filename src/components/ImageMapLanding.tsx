'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/theme/ThemeToggle'

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
    <div className="fixed inset-0 overflow-hidden bg-[var(--background)]">
      <div
        className="absolute inset-0"
        style={{ padding: 'var(--hero-pad)' }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          {/* Brand lockup */}
          <div
            aria-label="Welcome to the world of Kevin Fraser. Explore. Laugh. Move. Connect."
            className="pointer-events-none absolute left-1/2 top-5 z-20 flex -translate-x-1/2 flex-col items-center text-center sm:top-7"
            style={{
              fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            <p
              className="m-0 text-[clamp(10px,1.2vw,13px)] leading-none tracking-[0.18em]"
              style={{ color: 'var(--gold)' }}
            >
              Welcome to the World of
            </p>
            <p className="m-0 mt-1 text-[clamp(28px,5vw,52px)] leading-[0.9] tracking-[0.02em] text-[var(--foreground)]">
              Kevin Fraser
            </p>
            <p className="m-0 mt-1.5 text-[clamp(10px,1.3vw,14px)] leading-none tracking-[0.16em] text-[var(--foreground-muted)]">
              Explore. Laugh. Move. Connect.
            </p>
            <svg
              width="180"
              height="10"
              viewBox="0 0 180 10"
              fill="none"
              aria-hidden="true"
              className="mt-1.5 h-auto w-[clamp(70px,10vw,120px)]"
            >
              <path
                d="M2 6.5 C40 2.5, 140 2.5, 178 6.5"
                stroke="var(--gold)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="absolute right-4 top-4 z-30 sm:right-5 sm:top-5">
            <ThemeToggle />
          </div>

          {/* Static hero — click zones only, no hover videos */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kevin-hero.jpeg"
            alt="Kevin Fraser World"
            className="absolute inset-0 h-full w-full select-none object-contain object-center"
            draggable={false}
          />

          <div className="absolute inset-0 z-10">
            {HOTSPOTS.map((spot) => {
              const zone = (
                <div
                  className="absolute cursor-pointer rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
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
                    className="contents"
                  >
                    {zone}
                  </a>
                )
              }

              return (
                <Link key={spot.id} href={spot.href} className="contents">
                  {zone}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
