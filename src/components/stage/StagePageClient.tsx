'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import TicketButton from '@/components/stage/TicketButton'
import { formatPrice, formatShowDate } from '@/lib/format'
import type { PublicShow, PublicTour } from '@/lib/serialize'

type Props = {
  tours: PublicTour[]
  shows: PublicShow[]
  cancelled?: boolean
}

function statusLabel(status: string) {
  if (status === 'sold_out') return 'Sold Out'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'coming_soon') return 'Coming Soon'
  return null
}

export default function StagePageClient({ tours, shows, cancelled }: Props) {
  const featuredTour = tours.find((t) => t.featured) || tours[0]
  const countries = Array.from(new Set(shows.map((s) => s.country)))

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: '#07070b' }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,107,53,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 20%, rgba(123,47,247,0.12), transparent 50%)',
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5 border-b border-white/5">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span
            className="uppercase tracking-[0.22em] text-xs"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            Kevin Fraser
          </span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">The Stage</span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 sm:px-8 pb-24 pt-10 sm:pt-14">
        {cancelled ? (
          <div className="mb-8 rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Checkout cancelled — your tickets were not purchased.
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-14"
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em] text-[#FF6B35]">Live dates</p>
          <h1
            className="text-5xl sm:text-7xl leading-[0.9] uppercase text-white"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            {featuredTour ? featuredTour.title : 'Upcoming Shows'}
          </h1>
          {featuredTour?.subtitle ? (
            <p className="mt-4 text-sm uppercase tracking-[0.25em] text-zinc-400">
              {featuredTour.subtitle}
            </p>
          ) : null}
          {featuredTour?.description ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300">
              {featuredTour.description}
            </p>
          ) : (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300">
              Tour dates and tickets. New cities drop here first.
            </p>
          )}
        </motion.section>

        {shows.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-zinc-400">New dates dropping soon.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {countries.map((country, countryIndex) => {
              const countryShows = shows.filter((s) => s.country === country)
              return (
                <motion.section
                  key={country}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 * countryIndex }}
                >
                  <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-3">
                    <h2
                      className="text-3xl uppercase tracking-wide text-white"
                      style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
                    >
                      {country}
                    </h2>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                      {countryShows.length} shows
                    </span>
                  </div>

                  <ul className="divide-y divide-white/8">
                    {countryShows.map((show) => {
                      const d = formatShowDate(show.date)
                      const soldOut = show.status === 'sold_out'
                      const unavailable =
                        soldOut || show.status === 'cancelled' || show.status === 'coming_soon'
                      const badge = statusLabel(show.status)

                      return (
                        <li
                          key={show.id}
                          className="group grid grid-cols-[72px_1fr] sm:grid-cols-[88px_1fr_auto] gap-4 sm:gap-6 py-5 items-center"
                        >
                          <div className="text-center">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                              {d.month}
                            </div>
                            <div
                              className="text-4xl leading-none text-white"
                              style={{
                                fontFamily: "'Franklin Gothic Extra Condensed', sans-serif",
                              }}
                            >
                              {d.day}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600">
                              {d.weekday}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
                                {show.city}
                              </h3>
                              {show.featured ? (
                                <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 border border-[#FF6B35]/50 text-[#FF6B35]">
                                  Featured
                                </span>
                              ) : null}
                              {badge ? (
                                <span
                                  className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5"
                                  style={{
                                    background: soldOut ? 'rgba(255,45,85,0.15)' : 'rgba(255,255,255,0.06)',
                                    color: soldOut ? '#FF2D55' : '#aaa',
                                  }}
                                >
                                  {badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-zinc-300">{show.venue}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {[show.address, show.showTime].filter(Boolean).join(' · ')}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-400 sm:hidden">
                              {formatPrice(show.priceCents, show.currency)}
                            </p>
                          </div>

                          <div className="col-span-2 sm:col-span-1 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                            <span className="hidden sm:block text-sm text-zinc-300">
                              {formatPrice(show.priceCents, show.currency)}
                            </span>
                            <TicketButton
                              showId={show.id}
                              disabled={unavailable}
                              label={soldOut ? 'Sold Out' : badge || 'Tickets'}
                            />
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
          <section className="mt-16 border-t border-white/10 pt-10">
            <h2
              className="mb-6 text-2xl uppercase tracking-wide text-white"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              All Tours
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="border border-white/10 bg-white/[0.02] px-5 py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{tour.title}</h3>
                    {tour.featured ? (
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[#FF6B35]">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  {tour.subtitle ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {tour.subtitle}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
