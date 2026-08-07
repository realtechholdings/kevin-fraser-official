'use client'

import { useMemo, useState } from 'react'
import type { PublicTicketTier } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'
import { isTierSoldOut } from '@/lib/tickets/soldOut'

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
  const publishedTiers = useMemo(
    () => tiers.filter((tier) => tier.published),
    [tiers],
  )

  const purchasableTiers = useMemo(
    () => publishedTiers.filter((tier) => !isTierSoldOut(tier)),
    [publishedTiers],
  )

  const [tierId, setTierId] = useState(purchasableTiers[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected =
    purchasableTiers.find((t) => t.id === tierId) || purchasableTiers[0]

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
    } finally {
      setLoading(false)
    }
  }

  if (!purchasableTiers.length) {
    return (
      <div className={className}>
        {publishedTiers.length > 1 ? (
          <select
            disabled
            className="mb-2 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none opacity-60"
          >
            {publishedTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name} — Sold Out
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          disabled
          className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] opacity-40"
          style={{ background: 'var(--surface-muted)', color: 'var(--foreground-subtle)' }}
        >
          Sold Out
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {publishedTiers.length > 1 ? (
        <select
          value={selected?.id || ''}
          onChange={(e) => setTierId(e.target.value)}
          disabled={disabled || loading}
          className="mb-2 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
        >
          {publishedTiers.map((tier) => {
            const soldOut = isTierSoldOut(tier)
            return (
              <option key={tier.id} value={tier.id} disabled={soldOut}>
                {tier.name} —{' '}
                {soldOut ? 'Sold Out' : formatPrice(tier.priceCents, tier.currency)}
              </option>
            )
          })}
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
