'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'

type Option = {
  slug: string
  name: string
  description: string
  currency: string
  unitPriceCents: number
  chargeCents: number
  remaining: number | null
}

type ShowOption = {
  id: string
  city: string
  venue: string
  dateLabel: string
  options: Option[]
}

type Payload = {
  blocked: string
  order: { id: string; email: string; holderName: string; quantity: number; tierName: string }
  show: { city: string; venue: string; date: string } | null
  shows: ShowOption[]
}

export default function StageTransferClient({
  orderId,
  token,
  cancelled,
}: {
  orderId: string
  token: string
  cancelled?: boolean
}) {
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupOrder, setLookupOrder] = useState(orderId)
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState('')
  const [done, setDone] = useState(false)
  const [qty, setQty] = useState(1)
  const [loaded, setLoaded] = useState(false)

  async function load(event?: React.FormEvent, nextQty = qty) {
    event?.preventDefault()
    const id = (data ? data.order.id : lookupOrder).trim()
    const email = lookupEmail.trim()
    if (!id || (!token && !email)) {
      setError('Enter the email address and order number from your ticket.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ order: id })
      if (loaded && nextQty > 0) params.set('quantity', String(nextQty))
      if (token && id === orderId) params.set('token', token)
      if (email) params.set('email', email)
      const res = await fetch(`/api/transfer?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load this booking.')
      setData(json)
      setQty(loaded && nextQty > 0 ? nextQty : json.order?.quantity || 1)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this booking.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId && token) void load()
    // The link from the ticket email is enough to open the booking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token])

  async function start(showId: string, toSlug: string) {
    if (!data) return
    setBusyKey(`${showId}:${toSlug}`)
    setError('')
    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: data.order.id,
          token: data.order.id === orderId ? token : '',
          email: lookupEmail || data.order.email,
          showId,
          toSlug,
          quantity: qty,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Transfer failed')
      if (json.url) {
        window.location.href = json.url
        return
      }
      if (json.completed) {
        setDone(true)
        return
      }
      throw new Error('Transfer did not start.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed')
      setBusyKey('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-12">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-5" size={48} style={{ color: 'var(--accent)' }} />
            <h1
              className="text-4xl uppercase text-[var(--foreground)]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Tickets moved
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--foreground-muted)]">
              The new tickets are on their way to {data?.order.email}. The old tickets no longer scan.
            </p>
            <Link
              href="/worlds/stage"
              className="mt-8 inline-flex rounded-full px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              Back to shows
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-subtle)]">
              Ticket transfer
            </p>
            <h1
              className="mt-2 text-4xl uppercase text-[var(--foreground)]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Move your tickets
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
              Choose another show on this tour. If the new tickets cost more, you pay the difference.
              The seats are held while that payment is completed.
            </p>
            {cancelled ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
                The payment was cancelled. Your original tickets are unchanged.
              </p>
            ) : null}

            {!loaded ? (
              <form onSubmit={(event) => void load(event)} className="mt-6 space-y-3">
                <label className="block text-xs text-[var(--foreground-muted)]">
                  Email on the booking
                  <input
                    required={!token}
                    type="email"
                    value={lookupEmail}
                    onChange={(event) => setLookupEmail(event.target.value)}
                    className="mt-1 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                  />
                </label>
                <label className="block text-xs text-[var(--foreground-muted)]">
                  Order number
                  <input
                    required
                    value={lookupOrder}
                    onChange={(event) => setLookupOrder(event.target.value)}
                    className="mt-1 w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {loading ? 'Looking up…' : 'Find tickets'}
                </button>
              </form>
            ) : data ? (
              <div className="mt-6 space-y-5">
                <p className="text-sm text-[var(--foreground)]">
                  {data.order.holderName ? `${data.order.holderName} · ` : ''}
                  {data.order.quantity} × {data.order.tierName}
                  {data.show ? ` · ${data.show.city}` : ''}
                </p>
                {data.blocked ? (
                  <p className="text-sm text-[var(--foreground-muted)]">{data.blocked}</p>
                ) : (
                  <>
                    {data.order.quantity > 1 ? (
                      <label className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                        Tickets to move
                        <select
                          value={qty}
                          onChange={(event) => {
                            const next = Number(event.target.value) || 1
                            setQty(next)
                            void load(undefined, next)
                          }}
                          className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[var(--foreground)]"
                        >
                          {Array.from({ length: data.order.quantity }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {data.shows.length === 0 ? (
                      <p className="text-sm text-[var(--foreground-muted)]">
                        No other shows have a matching ticket available right now.
                      </p>
                    ) : (
                      data.shows.map((show) => (
                        <div key={show.id} className="rounded-2xl border border-[var(--border)] p-4">
                          <p className="font-medium text-[var(--foreground)]">
                            {show.city} · {show.venue}
                          </p>
                          <p className="mt-1 text-xs text-[var(--foreground-muted)]">{show.dateLabel}</p>
                          <ul className="mt-3 space-y-2">
                            {show.options.map((option) => (
                              <li key={option.slug} className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm text-[var(--foreground)]">{option.name}</p>
                                  {option.description ? (
                                    <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                                      {option.description}
                                    </p>
                                  ) : null}
                                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                                    {option.chargeCents > 0
                                      ? `${formatPrice(option.chargeCents, option.currency)} to pay`
                                      : 'No extra charge'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={Boolean(busyKey)}
                                  onClick={() => void start(show.id, option.slug)}
                                  className="shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] disabled:opacity-60"
                                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                >
                                  {busyKey === `${show.id}:${option.slug}` ? 'Moving…' : 'Move'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            ) : null}
            {error ? (
              <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
