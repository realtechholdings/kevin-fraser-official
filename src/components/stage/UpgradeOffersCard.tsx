'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/format'

export type PublicUpgradeOffer = {
  slug: string
  name: string
  description: string
  currency: string
  chargeCents: number
}

export default function UpgradeOffersCard({
  orderId,
  token,
  currentTier,
  quantity,
  offers,
}: {
  orderId: string
  token: string
  currentTier: string
  quantity: number
  offers: PublicUpgradeOffer[]
}) {
  const [busySlug, setBusySlug] = useState('')
  const [error, setError] = useState('')

  if (!offers.length) return null

  async function start(toSlug: string) {
    setBusySlug(toSlug)
    setError('')
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, token, toSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upgrade failed')
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.completed) {
        window.location.href = `/worlds/stage/success?upgraded=1`
        return
      }
      throw new Error('Upgrade did not start.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed')
      setBusySlug('')
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-6 text-left">
      <p
        className="text-lg uppercase text-[var(--foreground)]"
        style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
      >
        Upgrade these tickets
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
        You’re holding {quantity} × {currentTier}. Pay the difference and your old PDFs stop
        scanning — new tickets are emailed straight away.
      </p>
      <ul className="mt-4 space-y-3">
        {offers.map((offer) => (
          <li
            key={offer.slug}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{offer.name}</p>
              {offer.description ? (
                <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{offer.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                {offer.chargeCents > 0
                  ? `${formatPrice(offer.chargeCents, offer.currency)} more`
                  : 'No extra charge'}
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(busySlug)}
              onClick={() => void start(offer.slug)}
              className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              {busySlug === offer.slug ? 'Working…' : 'Upgrade'}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
