'use client'

import { useEffect, useState } from 'react'
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

function GymTonikModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gym & Tonik"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(480px, 100%)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(196,163,90,0.35)',
          background: '#000',
          padding: '2.5rem 2rem 2.25rem',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '0.9rem',
            right: '0.9rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '9999px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.95rem',
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gym-tonik-logo.png"
          alt="Gym & Tonik"
          style={{ width: '100%', maxWidth: '340px', height: 'auto', margin: '0 auto' }}
          draggable={false}
        />

        <p
          style={{
            margin: '1.5rem 0 0',
            fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            fontSize: 'clamp(11px, 1.4vw, 13px)',
            color: '#C4A35A',
          }}
        >
          Movement · Wellness · Energy
        </p>
        <p
          style={{
            margin: '0.9rem auto 0',
            maxWidth: '320px',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'rgba(242,240,235,0.85)',
          }}
        >
          The movement, wellness and energy app — launching later this year.
        </p>
      </div>
    </div>
  )
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
    href: '',
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
  // The "1990" wall behind Kevin — kept last so it stacks above neighbouring zones
  {
    id: 'about',
    href: '/about',
    label: 'About Kevin Fraser',
    top: '43%',
    left: '36%',
    width: '10%',
    height: '15%',
  },
]

export default function ImageMapLanding() {
  const [gymModalOpen, setGymModalOpen] = useState(false)

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

          if (spot.id === 'gym') {
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setGymModalOpen(true)}
                style={{
                  display: 'contents',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                {zone}
              </button>
            )
          }

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

      {/* Legal links — middle bottom */}
      <nav
        aria-label="Legal"
        style={{
          position: 'fixed',
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px 14px',
          maxWidth: 'calc(100vw - 2rem)',
          fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
          textTransform: 'uppercase',
          fontSize: 'clamp(10px, 1.2vw, 12px)',
          letterSpacing: '0.14em',
        }}
      >
        {[
          { href: '/terms', label: 'Terms of Service' },
          { href: '/refund-policy', label: 'Refund Policy' },
          { href: '/privacy', label: 'Privacy' },
        ].map((link, i) => (
          <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
            {i > 0 ? (
              <span aria-hidden="true" style={{ color: 'rgba(196,163,90,0.55)' }}>
                ·
              </span>
            ) : null}
            <Link
              href={link.href}
              style={{
                color: 'rgba(242,240,235,0.72)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#C4A35A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(242,240,235,0.72)'
              }}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </nav>

      {gymModalOpen ? <GymTonikModal onClose={() => setGymModalOpen(false)} /> : null}
    </div>
  )
}
