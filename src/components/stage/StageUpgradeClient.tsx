'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import type { PublicUpgradeOffer } from '@/components/stage/UpgradeOffersCard'

type Payload = {
  blocked: string | null
  order: { id: string; email: string; quantity: number; tierName: string; status: string }
  show: { city: string; venue: string; date: string; tour: string } | null
  offers: PublicUpgradeOffer[]
}

export default function StageUpgradeClient({
  orderId,
  token,
  cancelled,
}: {
  orderId: string
  token: string
  cancelled?: boolean
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busySlug, setBusySlug] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelledFetch = false
    void (async () => {
      try {
        const res = await fetch(
          `/api/upgrade?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`,
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Could not load this upgrade.')
        if (!cancelledFetch) setData(json)
      } catch (err) {
        if (!cancelledFetch) {
          setError(err instanceof Error ? err.message : 'Could not load this upgrade.')
        }
      } finally {
        if (!cancelledFetch) setLoading(false)
      }
    })()
    return () => {
      cancelledFetch = true
    }
  }, [orderId, token])

  async function start(toSlug: string) {
    setBusySlug(toSlug)
    setError('')
    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, token, toSlug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upgrade failed')
      if (json.url) {
        window.location.href = json.url
        return
      }
      if (json.completed) {
        setDone(true)
        return
      }
      throw new Error('Upgrade did not start.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed')
      setBusySlug('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-12">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-5" size={48} style={{ color: 'var(--accent)' }} />
            <h1
              className="text-4xl uppercase text-[var(--foreground)]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Upgraded
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--foreground-muted)]">
              Your new tickets are on the way. Previous PDFs will not scan at the door.
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
            <h1
              className="text-center text-4xl uppercase text-[var(--foreground)]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Upgrade tickets
            </h1>
            {cancelled ? (
              <p className="mt-4 text-center text-sm text-[var(--foreground-muted)]">
                Checkout was cancelled. Your current tickets are still valid.
              </p>
            ) : null}
            {loading ? (
              <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">Loading…</p>
            ) : error && !data ? (
              <p className="mt-6 text-center text-sm text-red-400">{error}</p>
            ) : data ? (
              <>
                <p className="mt-4 text-center text-sm leading-relaxed text-[var(--foreground-muted)]">
                  {data.order.quantity} × {data.order.tierName}
                  {data.show
                    ? ` · ${data.show.city}${data.show.date ? ` · ${data.show.date}` : ''}`
                    : ''}
                </p>
                {data.blocked || !data.offers.length ? (
                  <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
                    There isn’t an upgrade available for these tickets right now.
                  </p>
                ) : (
                  <ul className="mt-8 space-y-3">
                    {data.offers.map((offer) => (
                      <li
                        key={offer.slug}
                        className="rounded-2xl border border-[var(--border)] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {offer.name}
                            </p>
                            {offer.description ? (
                              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                                {offer.description}
                              </p>
                            ) : null}
                            <p className="mt-2 text-sm text-[var(--foreground)]">
                              {offer.chargeCents > 0
                                ? `${formatPrice(offer.chargeCents, offer.currency)} more`
                                : 'No extra charge'}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={Boolean(busySlug)}
                            onClick={() => void start(offer.slug)}
                            className="inline-flex shrink-0 items-center rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-50"
                            style={{
                              background: 'var(--accent)',
                              color: 'var(--accent-contrast)',
                            }}
                          >
                            <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                            {busySlug === offer.slug ? 'Working…' : 'Upgrade'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
              </>
            ) : null}
            <div className="mt-8 text-center">
              <Link
                href="/worlds/stage"
                className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground-muted)]"
              >
                Back to shows
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
