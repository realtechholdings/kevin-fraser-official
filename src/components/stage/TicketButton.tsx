'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PublicTicketTier } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'
import { centsToMetaValue, savePendingCheckout, trackMeta } from '@/lib/metaPixel'
import { isTierSoldOut } from '@/lib/tickets/soldOut'

type Props = {
  showId: string
  tiers: PublicTicketTier[]
  disabled?: boolean
  label?: string
  className?: string
}

function maxQuantityForTier(tier: PublicTicketTier) {
  if (tier.capacity > 0) {
    return Math.max(1, Math.min(10, tier.capacity - tier.ticketsSold))
  }
  return 10
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
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected =
    purchasableTiers.find((t) => t.id === tierId) || purchasableTiers[0]

  const maxQty = selected ? maxQuantityForTier(selected) : 1

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), maxQty))
  }, [maxQty, tierId])

  async function checkout() {
    if (disabled || loading || !selected) return
    setLoading(true)
    setError('')
    try {
      const qty = Math.min(Math.max(1, quantity), maxQty)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          tierId: selected.legacy ? undefined : selected.id,
          quantity: qty,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed')
      }

      const checkoutParams = {
        content_ids: [showId],
        content_name: selected.name,
        content_type: 'product',
        value: centsToMetaValue(selected.priceCents * qty),
        currency: selected.currency,
        num_items: qty,
      }
      trackMeta('InitiateCheckout', checkoutParams)
      savePendingCheckout({ ...checkoutParams, showId })

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
          className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ background: 'var(--sold-out-bg)', color: 'var(--sold-out-fg)' }}
        >
          Sold Out
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        {publishedTiers.length > 1 ? (
          <select
            value={selected?.id || ''}
            onChange={(e) => setTierId(e.target.value)}
            disabled={disabled || loading}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
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
        ) : (
          <div className="flex items-center px-1 text-xs text-[var(--foreground-muted)]">
            {selected?.name}
          </div>
        )}
        <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]">
          <span className="uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">Qty</span>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            disabled={disabled || loading}
            className="bg-transparent outline-none"
            aria-label="Ticket quantity"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={checkout}
        disabled={disabled || loading || !selected}
        className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: disabled ? 'var(--sold-out-bg)' : 'var(--accent)',
          color: disabled ? 'var(--sold-out-fg)' : 'var(--accent-contrast)',
        }}
      >
        {loading
          ? 'Redirecting…'
          : quantity > 1
            ? `${label} · ${quantity}`
            : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
