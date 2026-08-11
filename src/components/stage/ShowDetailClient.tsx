'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, CalendarDays } from 'lucide-react'
import TicketButton from '@/components/stage/TicketButton'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { formatPrice, formatShowDate, formatShowTimeRange } from '@/lib/format'
import { centsToMetaValue, trackMeta } from '@/lib/metaPixel'
import type { PublicShow } from '@/lib/serialize'
import { isShowEffectivelySoldOut, isTierSoldOut } from '@/lib/tickets/soldOut'

function statusLabel(status: string, effectivelySoldOut: boolean) {
  if (effectivelySoldOut || status === 'sold_out') return 'Sold Out'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'coming_soon') return 'Coming Soon'
  return null
}

export default function ShowDetailClient({ show }: { show: PublicShow }) {
  const d = formatShowDate(show.date)
  const soldOut = isShowEffectivelySoldOut(show)
  const unavailable =
    soldOut || show.status === 'cancelled' || show.status === 'coming_soon'
  const badge = statusLabel(show.status, soldOut)
  const heroImage = show.artworkImage || show.venueImage
  const blurb =
    show.description ||
    (show.tour.title
      ? `${show.tour.title} comes to ${show.city} — ${show.venue}.`
      : `Kevin Fraser live in ${show.city}.`)

  const fromPrice =
    show.tiers && show.tiers.length
      ? Math.min(...show.tiers.map((t) => t.priceCents))
      : show.priceCents

  useEffect(() => {
    trackMeta('ViewContent', {
      content_ids: [show.id],
      content_name: `${show.city} · ${show.venue}`,
      content_type: 'product',
      content_category: show.tour.title || 'Live show',
      value: centsToMetaValue(fromPrice),
      currency: show.currency,
    })
  }, [show.id, show.city, show.venue, show.tour.title, show.currency, fromPrice])

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between py-4">
          <Link
            href="/worlds/stage"
            className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            <span
              className="text-xs uppercase tracking-[0.22em]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              The Stage
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl pb-24 pt-8 sm:pt-12"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]"
        >
          {heroImage ? (
            <div className="relative aspect-[16/9] sm:aspect-[2.4/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: show.artworkPosition || 'center center' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#FF6600]">
                  {show.tour.title || 'Live show'}
                </p>
                <h1
                  className="mt-2 text-4xl uppercase leading-[0.95] text-white sm:text-6xl"
                  style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                >
                  {show.city}
                </h1>
              </div>
            </div>
          ) : null}

          <div className="grid gap-8 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8 lg:p-10">
            <div>
              {!heroImage ? (
                <>
                  <p
                    className="mb-3 text-[11px] uppercase tracking-[0.3em]"
                    style={{ color: 'var(--accent)' }}
                  >
                    {show.tour.title || 'Live show'}
                  </p>
                  <h1
                    className="text-5xl uppercase leading-[0.92] sm:text-6xl"
                    style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                  >
                    {show.city}
                  </h1>
                </>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {show.featured ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em]"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    Featured
                  </span>
                ) : null}
                {badge ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em]"
                    style={{
                      background: soldOut ? 'var(--danger-soft)' : 'var(--surface-muted)',
                      color: soldOut ? 'var(--danger)' : 'var(--foreground-muted)',
                    }}
                  >
                    {badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--foreground-muted)]">
                {blurb}
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-subtle)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {d.weekday} {d.day} {d.month} {d.year}
                    </p>
                    {formatShowTimeRange(show.showTime, show.showEndTime) ? (
                      <p className="mt-0.5 text-[var(--foreground-muted)]">
                        Show {formatShowTimeRange(show.showTime, show.showEndTime)}
                      </p>
                    ) : null}
                    {show.doorsTime ? (
                      <p className="text-[var(--foreground-subtle)]">Doors {show.doorsTime}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-subtle)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{show.venue}</p>
                    <p className="mt-0.5 text-[var(--foreground-muted)]">
                      {[show.address, show.city, show.country].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              </div>

              {show.venueImage && show.artworkImage ? (
                <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={show.venueImage}
                    alt={`${show.venue}`}
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <p className="border-t border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--foreground-subtle)]">
                    {show.venue}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-subtle)]">
                Tickets
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {show.tiers && show.tiers.length > 1
                  ? `From ${formatPrice(fromPrice, show.currency)}`
                  : formatPrice(fromPrice, show.currency)}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                Choose your ticket type and quantity, then continue to secure checkout.
              </p>

              {show.tiers && show.tiers.length > 0 ? (
                <ul className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
                  {show.tiers
                    .filter((t) => t.published)
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents)
                    .map((tier) => {
                      const tierSoldOut = isTierSoldOut(tier)
                      return (
                        <li key={tier.id} className="text-sm">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-medium text-[var(--foreground)]">
                              {tier.name}
                            </span>
                            <span className="shrink-0 text-[var(--foreground-muted)]">
                              {tierSoldOut ? (
                                <span
                                  className="text-[10px] uppercase tracking-[0.14em]"
                                  style={{ color: 'var(--danger)' }}
                                >
                                  Sold Out
                                </span>
                              ) : (
                                formatPrice(tier.priceCents, tier.currency)
                              )}
                            </span>
                          </div>
                          {tier.description ? (
                            <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-subtle)]">
                              {tier.description}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                </ul>
              ) : null}

              <div className="mt-6">
                {show.externalTicketUrl ? (
                  <a
                    href={show.externalTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                  >
                    {soldOut ? 'Sold Out' : badge || 'Get Tickets'}
                  </a>
                ) : (
                  <TicketButton
                    showId={show.id}
                    tiers={show.tiers || []}
                    disabled={unavailable}
                    label={soldOut ? 'Sold Out' : badge || 'Buy Tickets'}
                    className="w-full [&_button]:w-full [&_select]:w-full"
                  />
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
