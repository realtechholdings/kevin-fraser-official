'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { NavPendingOverlay, usePendingNav } from '@/components/ui/NavPendingOverlay'
import { formatPrice, formatShowDate, formatShowTimeRange, formatTicketsOnSaleLabel } from '@/lib/format'
import type { PublicShow, PublicTour } from '@/lib/serialize'
import { isShowEffectivelySoldOut } from '@/lib/tickets/soldOut'

type Props = {
  tours: PublicTour[]
  shows: PublicShow[]
  cancelled?: boolean
  tourSlug?: string | null
}

function statusLabel(show: PublicShow, effectivelySoldOut: boolean) {
  if (effectivelySoldOut || show.status === 'sold_out') return 'Sold Out'
  if (show.status === 'cancelled') return 'Cancelled'
  if (show.status === 'coming_soon') {
    return formatTicketsOnSaleLabel(show.ticketsOnSaleAt) || 'Coming Soon'
  }
  return null
}

export default function StagePageClient({ tours, shows, cancelled, tourSlug }: Props) {
  const activeTour = useMemo(
    () => (tourSlug ? tours.find((t) => t.slug === tourSlug) || null : null),
    [tours, tourSlug],
  )
  const featuredTour = activeTour || tours.find((t) => t.featured) || tours[0]
  const visibleShows = useMemo(
    () => (activeTour ? shows.filter((s) => s.tour.id === activeTour.id) : shows),
    [shows, activeTour],
  )
  const countries = Array.from(new Set(visibleShows.map((s) => s.country)))
  const { pending, navigate } = usePendingNav()

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      {pending ? <NavPendingOverlay label="Loading show" /> : null}
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            <span
              className="text-xs uppercase tracking-[0.22em]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Kevin Fraser
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-[var(--foreground-subtle)] sm:inline">
              The Stage
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl pb-24 pt-10 sm:pt-14"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        {cancelled ? (
          <div
            className="mb-8 rounded-2xl border px-5 py-4 text-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
            }}
          >
            Checkout cancelled — your tickets were not purchased.
          </div>
        ) : null}

        {activeTour ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--foreground-muted)]">
              Showing dates for <span className="font-medium text-[var(--foreground)]">{activeTour.title}</span>
            </p>
            <Link
              href="/worlds/stage"
              className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-subtle)] transition-colors hover:text-[var(--foreground)]"
            >
              View all tours
            </Link>
          </div>
        ) : null}

        {(() => {
          const heroImage = featuredTour?.bannerImage || featuredTour?.coverImage || ''
          const bannerAbove = Boolean(
            featuredTour?.bannerImage && featuredTour.bannerPosition === 'above',
          )
          const bannerAsBackground = Boolean(heroImage && !bannerAbove)

          return (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="mb-12 sm:mb-16"
            >
              {bannerAbove && featuredTour?.bannerImage ? (
                <div className="mb-4 overflow-hidden rounded-[1.75rem] border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredTour.bannerImage}
                    alt=""
                    className="aspect-[21/9] w-full object-cover sm:aspect-[2.8/1]"
                    style={{ objectPosition: featuredTour.bannerFocus || 'center center' }}
                  />
                </div>
              ) : null}

              <div
                className={`relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] ${
                  bannerAsBackground ? '' : ''
                }`}
              >
                {bannerAsBackground ? (
                  <div className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImage}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: featuredTour?.bannerFocus || 'center center',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
                  </div>
                ) : null}
                <div
                  className={`relative p-7 sm:p-10 ${bannerAsBackground ? 'text-white' : ''}`}
                >
                  <p
                    className="mb-3 text-[11px] uppercase tracking-[0.35em]"
                    style={{ color: bannerAsBackground ? '#FF6600' : 'var(--accent)' }}
                  >
                    Live dates
                  </p>
                  <h1
                    className="max-w-3xl text-5xl leading-[0.92] uppercase sm:text-7xl"
                    style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                  >
                    {featuredTour ? featuredTour.title : 'Upcoming Shows'}
                  </h1>
                  {featuredTour?.subtitle ? (
                    <p
                      className={`mt-4 text-sm uppercase tracking-[0.25em] ${
                        bannerAsBackground
                          ? 'text-white/75'
                          : 'text-[var(--foreground-muted)]'
                      }`}
                    >
                      {featuredTour.subtitle}
                    </p>
                  ) : null}
                  <p
                    className={`mt-6 max-w-2xl text-base leading-relaxed ${
                      bannerAsBackground
                        ? 'text-white/80'
                        : 'text-[var(--foreground-muted)]'
                    }`}
                  >
                    {featuredTour?.description ||
                      'Tour dates and tickets. New cities drop here first.'}
                  </p>
                </div>
              </div>
            </motion.section>
          )
        })()}

        {visibleShows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center text-[var(--foreground-muted)]">
            {activeTour ? 'No upcoming dates for this tour yet.' : 'New dates dropping soon.'}
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {countries.map((country, countryIndex) => {
              const countryShows = visibleShows.filter((s) => s.country === country)
              return (
                <motion.section
                  key={country}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 * countryIndex }}
                  className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]"
                >
                  <div className="flex items-end justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
                    <h2
                      className="text-3xl uppercase tracking-wide"
                      style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                    >
                      {country}
                    </h2>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-subtle)]">
                      {countryShows.length} shows
                    </span>
                  </div>

                  <ul className="divide-y divide-[var(--border)]">
                    {countryShows.map((show) => {
                      const d = formatShowDate(show.date)
                      const soldOut = isShowEffectivelySoldOut(show)
                      const unavailable =
                        soldOut || show.status === 'cancelled' || show.status === 'coming_soon'
                      const badge = statusLabel(show, soldOut)

                      return (
                        <li
                          key={show.id}
                          className="grid grid-cols-[72px_1fr] items-center gap-4 px-5 py-6 sm:grid-cols-[72px_88px_1fr_auto] sm:gap-6 sm:px-7"
                        >
                          <div className="text-center">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                              {d.month}
                            </div>
                            <div
                              className="text-4xl leading-none"
                              style={{
                                fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
                              }}
                            >
                              {d.day}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest text-[var(--foreground-subtle)]">
                              {d.weekday}
                            </div>
                            <div className="mt-0.5 text-[10px] tracking-widest text-[var(--foreground-subtle)]">
                              {d.year}
                            </div>
                          </div>

                          {show.artworkImage ? (
                            <div className="hidden h-[88px] w-[88px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] sm:block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={show.artworkImage}
                                alt={`${show.city} artwork`}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="hidden sm:block" />
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold sm:text-xl">
                                {show.city}
                              </h3>
                              {show.featured ? (
                                <span
                                  className="rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em]"
                                  style={{
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                  }}
                                >
                                  Featured
                                </span>
                              ) : null}
                              {badge ? (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[9px] tracking-[0.2em] ${
                                    show.status === 'coming_soon' && show.ticketsOnSaleAt
                                      ? 'normal-case tracking-[0.06em]'
                                      : 'uppercase'
                                  }`}
                                  style={{
                                    background: soldOut
                                      ? 'var(--danger-soft)'
                                      : 'var(--surface-muted)',
                                    color: soldOut
                                      ? 'var(--danger)'
                                      : 'var(--foreground-muted)',
                                  }}
                                >
                                  {badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                              {show.venue}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--foreground-subtle)]">
                              {[
                                show.address,
                                formatShowTimeRange(show.showTime, show.showEndTime),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)] sm:hidden">
                              {show.tiers && show.tiers.length > 1
                                ? `From ${formatPrice(show.priceCents, show.currency)}`
                                : formatPrice(show.priceCents, show.currency)}
                            </p>
                          </div>

                          <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
                            <span className="hidden text-sm text-[var(--foreground-muted)] sm:block">
                              {show.tiers && show.tiers.length > 1
                                ? `From ${formatPrice(show.priceCents, show.currency)}`
                                : formatPrice(show.priceCents, show.currency)}
                            </span>
                            {unavailable && !soldOut ? (
                              <span
                                className={`inline-flex min-w-[8.5rem] max-w-[14rem] items-center justify-center rounded-full px-4 py-2.5 text-center text-[10px] font-semibold tracking-[0.08em] opacity-70 ${
                                  show.status === 'coming_soon' && show.ticketsOnSaleAt
                                    ? 'normal-case'
                                    : 'uppercase tracking-[0.14em]'
                                }`}
                                style={{
                                  background: 'var(--surface-muted)',
                                  color: 'var(--foreground-subtle)',
                                }}
                              >
                                {badge || 'Unavailable'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/worlds/stage/${show.id}`)}
                                disabled={pending}
                                className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity hover:opacity-90 disabled:cursor-wait"
                                style={{
                                  background: soldOut ? 'var(--surface-muted)' : 'var(--accent)',
                                  color: soldOut
                                    ? 'var(--foreground-subtle)'
                                    : 'var(--accent-contrast)',
                                }}
                              >
                                {soldOut ? 'Sold Out' : 'Tickets'}
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </motion.section>
              )
            })}
          </div>
        )}

        {tours.length > 1 ? (
          <section className="mt-12 border-t border-[var(--border)] pt-10 sm:mt-16">
            <h2
              className="mb-6 text-2xl uppercase tracking-wide"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              All Tours
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tours.map((tour) => {
                const cardBannerAbove =
                  Boolean(tour.bannerImage) && tour.bannerPosition === 'above'
                const cardBgImage = cardBannerAbove
                  ? tour.coverImage
                  : tour.bannerImage || tour.coverImage
                const isActive = activeTour?.id === tour.id

                return (
                  <Link
                    key={tour.id}
                    href={`/worlds/stage?tour=${encodeURIComponent(tour.slug)}`}
                    className="block space-y-3 rounded-2xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {cardBannerAbove ? (
                      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tour.bannerImage}
                          alt=""
                          className="aspect-[21/9] w-full object-cover"
                          style={{ objectPosition: tour.bannerFocus || 'center center' }}
                        />
                      </div>
                    ) : null}
                    <div
                      className="overflow-hidden rounded-2xl border bg-[var(--surface)]"
                      style={{
                        borderColor: isActive
                          ? 'color-mix(in srgb, var(--accent) 55%, transparent)'
                          : 'var(--border)',
                      }}
                    >
                      {cardBgImage ? (
                        <div className="aspect-[16/9] overflow-hidden bg-[var(--surface-muted)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cardBgImage}
                            alt={tour.title}
                            className="h-full w-full object-cover"
                            style={{ objectPosition: tour.bannerFocus || 'center center' }}
                          />
                        </div>
                      ) : null}
                      <div className="px-6 py-6">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold">{tour.title}</h3>
                          {tour.featured ? (
                            <span
                              className="text-[9px] uppercase tracking-[0.2em]"
                              style={{ color: 'var(--accent)' }}
                            >
                              Featured
                            </span>
                          ) : null}
                        </div>
                        {tour.subtitle ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--foreground-subtle)]">
                            {tour.subtitle}
                          </p>
                        ) : null}
                        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                          View shows
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
