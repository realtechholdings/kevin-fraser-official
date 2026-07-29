'use client'

import { useMemo, useState } from 'react'
import type { PublicTicketTier } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'

type Props = {
  showId: string
  tiers: PublicTicketTier[]
  disabled?: boolean
  label?: string
  className?: string
}

export default function TicketButton({
  showId,
  tiers,
  disabled,
  label = 'Get Tickets',
  className = '',
}: Props) {
  const availableTiers = useMemo(
    () =>
      tiers.filter((tier) => {
        if (!tier.published) return false
        if (tier.capacity > 0 && tier.ticketsSold >= tier.capacity) return false
        return true
      }),
    [tiers],
  )

  const [tierId, setTierId] = useState(availableTiers[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = availableTiers.find((t) => t.id === tierId) || availableTiers[0]

  async function checkout() {
    if (disabled || loading || !selected) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          tierId: selected.legacy ? undefined : selected.id,
          quantity: 1,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  if (!availableTiers.length) {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] opacity-40"
          style={{ background: 'var(--surface-muted)', color: 'var(--foreground-subtle)' }}
        >
          Unavailable
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {availableTiers.length > 1 ? (
        <select
          value={selected?.id || ''}
          onChange={(e) => setTierId(e.target.value)}
          disabled={disabled || loading}
          className="mb-2 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
        >
          {availableTiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name} — {formatPrice(tier.priceCents, tier.currency)}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        onClick={checkout}
        disabled={disabled || loading || !selected}
        className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: disabled ? 'var(--surface-muted)' : 'var(--accent)',
          color: disabled ? 'var(--foreground-subtle)' : 'var(--accent-contrast)',
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
