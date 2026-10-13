'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PublicTicketTier } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'
import { centsToMetaValue, identifyMetaUser, savePendingCheckout, trackMeta } from '@/lib/metaPixel'
import { isTierSoldOut, remainingOfferingUnits } from '@/lib/tickets/soldOut'
import { MAX_TICKET_QUANTITY } from '@/lib/tickets/limits'
import { normalizeCheckoutEmail } from '@/lib/email/address'
import FormattedText from '@/components/FormattedText'

const EMAIL_STORAGE_KEY = 'kf_checkout_email'

type Props = {
  showId: string
  tiers: PublicTicketTier[]
  venueRemaining?: number | null
  showStatus?: string
  disabled?: boolean
  label?: string
  className?: string
  /** Tier rows are the selector. Clicking one opens the quantity control. */
  layout?: 'compact' | 'rows'
}

function maxQuantityForTier(
  tier: PublicTicketTier,
  venueRemaining: number | null,
  allTiers: PublicTicketTier[],
) {
  const remaining = remainingOfferingUnits(tier, venueRemaining, allTiers)
  const byStock = remaining === null ? MAX_TICKET_QUANTITY : remaining
  if (tier.kind === 'table') {
    const seats = Math.max(1, tier.seats || 1)
    const maxByPdfs = Math.max(1, Math.floor(MAX_TICKET_QUANTITY / seats))
    return Math.max(1, Math.min(byStock, maxByPdfs, MAX_TICKET_QUANTITY))
  }
  return Math.max(1, Math.min(MAX_TICKET_QUANTITY, byStock))
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
  venueRemaining = null,
  showStatus,
  disabled,
  label = 'Get Tickets',
  className = '',
  layout = 'compact',
}: Props) {
  const publishedTiers = useMemo(
    () => tiers.filter((tier) => tier.published),
    [tiers],
  )

  const purchasableTiers = useMemo(
    () =>
      publishedTiers.filter(
        (tier) => !isTierSoldOut(tier, venueRemaining, publishedTiers, showStatus),
      ),
    [publishedTiers, venueRemaining, showStatus],
  )

  const [tierId, setTierId] = useState(purchasableTiers[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected =
    purchasableTiers.find((t) => t.id === tierId) || purchasableTiers[0]

  const maxQty = selected ? maxQuantityForTier(selected, venueRemaining, publishedTiers) : 1

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

  function tierRow(tier: PublicTicketTier, selectable: boolean) {
    const soldOut = isTierSoldOut(tier, venueRemaining, publishedTiers, showStatus)
    const active = selectable && !soldOut && selected?.id === tier.id
    return (
      <li key={tier.id}>
        <button
          type="button"
          disabled={!selectable || soldOut || disabled || loading}
          onClick={() => setTierId(tier.id)}
          aria-pressed={active}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left text-sm disabled:cursor-default"
          style={{
            borderColor: active ? 'var(--accent)' : 'var(--border)',
            background: active ? 'var(--accent-soft)' : 'transparent',
          }}
        >
          <span className="font-medium text-[var(--foreground)]">{offeringLabel(tier)}</span>
          <span className="flex shrink-0 items-center gap-2 text-[var(--foreground-muted)]">
            <span>{formatPrice(tier.priceCents, tier.currency)}</span>
            {soldOut ? (
              <span
                className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                Sold Out
              </span>
            ) : null}
          </span>
        </button>
        {tier.description ? (
          <FormattedText
            text={tier.description}
            className="mt-1 px-1 text-xs leading-relaxed text-[var(--foreground-subtle)]"
          />
        ) : null}
        {active ? (
          <label className="mt-2 flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]">
            <span className="uppercase tracking-[0.14em] text-[var(--foreground-subtle)]">
              {tier.kind === 'table' ? 'Tables' : 'Qty'}
            </span>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              disabled={disabled || loading}
              className="bg-transparent outline-none"
              aria-label={tier.kind === 'table' ? 'Number of tables' : 'Ticket quantity'}
            >
              {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </li>
    )
  }

  if (!purchasableTiers.length) {
    return (
      <div className={className}>
        {layout === 'rows' && publishedTiers.length ? (
          <ul className="mb-4 space-y-3">{publishedTiers.map((tier) => tierRow(tier, false))}</ul>
        ) : publishedTiers.length > 1 ? (
          <select
            disabled
            className="mb-2 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none opacity-60"
          >
            {publishedTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {offeringLabel(tier)} — {formatPrice(tier.priceCents, tier.currency)} — Sold Out
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
      {layout === 'rows' ? (
        <ul className="mb-4 space-y-3">{publishedTiers.map((tier) => tierRow(tier, true))}</ul>
      ) : (
      <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        {publishedTiers.length > 1 ? (
          <select
            value={selected?.id || ''}
            onChange={(e) => setTierId(e.target.value)}
            disabled={disabled || loading}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
          >
            {publishedTiers.map((tier) => {
              const soldOut = isTierSoldOut(tier, venueRemaining, publishedTiers, showStatus)
              return (
                <option key={tier.id} value={tier.id} disabled={soldOut}>
                  {offeringLabel(tier)} — {formatPrice(tier.priceCents, tier.currency)}
                  {soldOut ? ' — Sold Out' : ''}
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
      )}
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
