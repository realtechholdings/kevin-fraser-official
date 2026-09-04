'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PublicTicketTier } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'
import { centsToMetaValue, identifyMetaUser, savePendingCheckout, trackMeta } from '@/lib/metaPixel'
import { isTierSoldOut } from '@/lib/tickets/soldOut'
import { MAX_TICKET_QUANTITY } from '@/lib/tickets/limits'
import { normalizeCheckoutEmail } from '@/lib/email/address'

const EMAIL_STORAGE_KEY = 'kf_checkout_email'

type Props = {
  showId: string
  tiers: PublicTicketTier[]
  disabled?: boolean
  label?: string
  className?: string
}

function maxQuantityForTier(tier: PublicTicketTier) {
  const remaining =
    tier.capacity > 0
      ? Math.max(0, tier.capacity - tier.ticketsSold)
      : MAX_TICKET_QUANTITY
  if (tier.kind === 'table') {
    const seats = Math.max(1, tier.seats || 1)
    const maxByPdfs = Math.max(1, Math.floor(MAX_TICKET_QUANTITY / seats))
    const cap = remaining || MAX_TICKET_QUANTITY
    return Math.max(1, Math.min(cap, maxByPdfs, MAX_TICKET_QUANTITY))
  }
  if (tier.capacity > 0) {
    return Math.max(1, Math.min(MAX_TICKET_QUANTITY, remaining))
  }
  return MAX_TICKET_QUANTITY
}

function offeringLabel(tier: PublicTicketTier) {
  if (tier.kind === 'table' && tier.seats) {
    return `${tier.name} (${tier.seats} tickets)`
  }
  return tier.name
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
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected =
    purchasableTiers.find((t) => t.id === tierId) || purchasableTiers[0]

  const maxQty = selected ? maxQuantityForTier(selected) : 1

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), maxQty))
  }, [maxQty, tierId])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_STORAGE_KEY)
      if (saved) setEmail(saved)
    } catch {
      // ignore
    }
  }, [])

  async function checkout() {
    if (disabled || loading || !selected) return
    const buyerEmail = normalizeCheckoutEmail(email)
    if (!buyerEmail) {
      setError('Enter your email so we can send your tickets.')
      return
    }
    setLoading(true)
    setError('')
    try {
      try {
        localStorage.setItem(EMAIL_STORAGE_KEY, buyerEmail)
      } catch {
        // ignore
      }
      const qty = Math.min(Math.max(1, quantity), maxQty)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          tierId: selected.legacy ? undefined : selected.id,
          quantity: qty,
          email: buyerEmail,
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
      identifyMetaUser(buyerEmail)
      trackMeta('InitiateCheckout', checkoutParams)
      savePendingCheckout({ ...checkoutParams, showId, email: buyerEmail })

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
                {offeringLabel(tier)} — Sold Out
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
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        void checkout()
      }}
    >
      <label className="mb-2 block">
        <span className="sr-only">Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || loading}
          placeholder="Email for your tickets"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
        />
      </label>
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
                  {offeringLabel(tier)} —{' '}
                  {soldOut ? 'Sold Out' : formatPrice(tier.priceCents, tier.currency)}
                </option>
              )
            })}
          </select>
        ) : (
          <div className="flex items-center px-1 text-xs text-[var(--foreground-muted)]">
            {selected?.kind === 'table' && selected.seats
              ? `${offeringLabel(selected)}`
              : selected?.name}
          </div>
        )}
        <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]">
          <span className="uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
            {selected?.kind === 'table' ? 'Tables' : 'Qty'}
          </span>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            disabled={disabled || loading}
            className="bg-transparent outline-none"
            aria-label={selected?.kind === 'table' ? 'Number of tables' : 'Ticket quantity'}
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
        type="submit"
        disabled={disabled || loading || !selected}
        className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
        style={{
          background: disabled ? 'var(--surface-muted)' : 'var(--accent)',
          color: disabled ? 'var(--foreground-subtle)' : 'var(--accent-contrast)',
        }}
      >
        {loading
          ? 'Redirecting…'
          : quantity > 1
            ? `${label} · ${quantity}${selected?.kind === 'table' ? ' tables' : ''}`
            : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </form>
  )
}
