'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { PublicShow, PublicTour } from '@/lib/serialize'
import { formatPrice, formatShowDate } from '@/lib/format'

type TourForm = {
  title: string
  slug: string
  subtitle: string
  description: string
  featured: boolean
  published: boolean
  startDate: string
  endDate: string
}

type ShowForm = {
  tourId: string
  title: string
  date: string
  showTime: string
  country: string
  city: string
  venue: string
  address: string
  currency: string
  priceCents: string
  capacity: string
  status: string
  featured: boolean
  published: boolean
  externalTicketUrl: string
}

const emptyTour: TourForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  featured: false,
  published: true,
  startDate: '',
  endDate: '',
}

const emptyShow = (tourId = ''): ShowForm => ({
  tourId,
  title: '',
  date: '',
  showTime: '19:30',
  country: 'Australia',
  city: '',
  venue: '',
  address: '',
  currency: 'AUD',
  priceCents: '7500',
  capacity: '400',
  status: 'on_sale',
  featured: false,
  published: true,
  externalTicketUrl: '',
})

function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminPortal() {
  const [tours, setTours] = useState<PublicTour[]>([])
  const [shows, setShows] = useState<PublicShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'tours' | 'shows'>('tours')
  const [tourForm, setTourForm] = useState<TourForm>(emptyTour)
  const [editingTourId, setEditingTourId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<ShowForm>(emptyShow())
  const [editingShowId, setEditingShowId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [tRes, sRes] = await Promise.all([
        fetch('/api/admin/tours'),
        fetch('/api/admin/shows'),
      ])
      const tData = await tRes.json()
      const sData = await sRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Failed to load tours')
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load shows')
      setTours(tData.tours)
      setShows(sData.shows)
      if (!showForm.tourId && tData.tours[0]) {
        setShowForm((prev) => ({ ...prev, tourId: tData.tours[0].id }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tourOptions = useMemo(
    () => tours.map((t) => ({ id: t.id, label: t.title })),
    [tours]
  )

  async function saveTour(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...tourForm,
        priceCents: undefined,
        startDate: tourForm.startDate || null,
        endDate: tourForm.endDate || null,
      }
      const res = await fetch(
        editingTourId ? `/api/admin/tours/${editingTourId}` : '/api/admin/tours',
        {
          method: editingTourId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMessage(editingTourId ? 'Tour updated.' : 'Tour created.')
      setTourForm(emptyTour)
      setEditingTourId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveShow(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...showForm,
        priceCents: Number(showForm.priceCents) || 0,
        capacity: Number(showForm.capacity) || 0,
      }
      const res = await fetch(
        editingShowId ? `/api/admin/shows/${editingShowId}` : '/api/admin/shows',
        {
          method: editingShowId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMessage(editingShowId ? 'Show updated.' : 'Show created.')
      setShowForm(emptyShow(showForm.tourId || tours[0]?.id || ''))
      setEditingShowId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function editTour(tour: PublicTour) {
    setEditingTourId(tour.id)
    setTourForm({
      title: tour.title,
      slug: tour.slug,
      subtitle: tour.subtitle,
      description: tour.description,
      featured: tour.featured,
      published: tour.published,
      startDate: toLocalInput(tour.startDate),
      endDate: toLocalInput(tour.endDate),
    })
    setTab('tours')
  }

  function editShow(show: PublicShow) {
    setEditingShowId(show.id)
    setShowForm({
      tourId: show.tour.id,
      title: show.title,
      date: toLocalInput(show.date),
      showTime: show.showTime,
      country: show.country,
      city: show.city,
      venue: show.venue,
      address: show.address,
      currency: show.currency,
      priceCents: String(show.priceCents),
      capacity: String(show.capacity),
      status: show.status,
      featured: show.featured,
      published: show.published,
      externalTicketUrl: show.externalTicketUrl,
    })
    setTab('shows')
  }

  async function toggleFeaturedTour(tour: PublicTour) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !tour.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeaturedShow(show: PublicShow) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shows/${show.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !show.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeTour(id: string) {
    if (!confirm('Delete this tour and all of its shows?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tours/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeShow(id: string) {
    if (!confirm('Delete this show?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shows/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function seedDecadance() {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Seed failed')
      setMessage(data.message || 'Seed complete.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B35]/60'
  const labelClass = 'mb-1 block text-[10px] uppercase tracking-[0.2em] text-zinc-500'

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: '#08080c' }}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#08080c]/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs uppercase tracking-[0.22em] text-zinc-400 hover:text-white">
            ← Site
          </Link>
          <h1
            className="text-2xl uppercase text-white"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            Admin
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/worlds/stage"
            className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-[#FF6B35]"
          >
            View Stage
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTab('tours')}
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
            style={{
              background: tab === 'tours' ? '#FF6B35' : 'transparent',
              color: tab === 'tours' ? '#0A0A0A' : '#aaa',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Tours
          </button>
          <button
            type="button"
            onClick={() => setTab('shows')}
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
            style={{
              background: tab === 'shows' ? '#FF6B35' : 'transparent',
              color: tab === 'shows' ? '#0A0A0A' : '#aaa',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Shows
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={seedDecadance}
            className="ml-auto px-4 py-2 text-[10px] uppercase tracking-[0.2em] border border-white/15 text-zinc-300 hover:text-white disabled:opacity-40"
          >
            Seed Decadance Tour
          </button>
        </div>

        {error ? (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : tab === 'tours' ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <form onSubmit={saveTour} className="space-y-3 border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm uppercase tracking-[0.2em] text-white">
                {editingTourId ? 'Edit Tour' : 'Create Tour'}
              </h2>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={fieldClass}
                  value={tourForm.title}
                  onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={fieldClass}
                  value={tourForm.slug}
                  onChange={(e) => setTourForm({ ...tourForm, slug: e.target.value })}
                  placeholder="auto from title if empty"
                />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input
                  className={fieldClass}
                  value={tourForm.subtitle}
                  onChange={(e) => setTourForm({ ...tourForm, subtitle: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${fieldClass} min-h-[100px]`}
                  value={tourForm.description}
                  onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start</label>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={tourForm.startDate}
                    onChange={(e) => setTourForm({ ...tourForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>End</label>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={tourForm.endDate}
                    onChange={(e) => setTourForm({ ...tourForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-sm text-zinc-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tourForm.featured}
                    onChange={(e) => setTourForm({ ...tourForm, featured: e.target.checked })}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tourForm.published}
                    onChange={(e) => setTourForm({ ...tourForm, published: e.target.checked })}
                  />
                  Published
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-40"
                  style={{ background: '#FF6B35', color: '#0A0A0A' }}
                >
                  {editingTourId ? 'Update Tour' : 'Create Tour'}
                </button>
                {editingTourId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTourId(null)
                      setTourForm(emptyTour)
                    }}
                    className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="space-y-3">
              {tours.length === 0 ? (
                <p className="text-sm text-zinc-500">No tours yet. Seed Decadance or create one.</p>
              ) : (
                tours.map((tour) => (
                  <div key={tour.id} className="border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{tour.title}</h3>
                        <p className="mt-1 text-xs text-zinc-500">{tour.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tour.featured ? (
                          <span className="text-[9px] uppercase tracking-widest text-[#FF6B35]">
                            Featured
                          </span>
                        ) : null}
                        {!tour.published ? (
                          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                            Draft
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editTour(tour)}
                        className="text-[10px] uppercase tracking-[0.18em] text-zinc-300 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleFeaturedTour(tour)}
                        className="text-[10px] uppercase tracking-[0.18em] text-[#FF6B35]"
                      >
                        {tour.featured ? 'Unfeature' : 'Make Featured'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeTour(tour.id)}
                        className="text-[10px] uppercase tracking-[0.18em] text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <form onSubmit={saveShow} className="space-y-3 border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm uppercase tracking-[0.2em] text-white">
                {editingShowId ? 'Edit Show' : 'Create Show'}
              </h2>
              <div>
                <label className={labelClass}>Tour</label>
                <select
                  className={fieldClass}
                  value={showForm.tourId}
                  onChange={(e) => setShowForm({ ...showForm, tourId: e.target.value })}
                  required
                >
                  <option value="">Select tour</option>
                  {tourOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={fieldClass}
                  value={showForm.title}
                  onChange={(e) => setShowForm({ ...showForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date & time</label>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={showForm.date}
                    onChange={(e) => setShowForm({ ...showForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Show time label</label>
                  <input
                    className={fieldClass}
                    value={showForm.showTime}
                    onChange={(e) => setShowForm({ ...showForm, showTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    className={fieldClass}
                    value={showForm.country}
                    onChange={(e) => setShowForm({ ...showForm, country: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={fieldClass}
                    value={showForm.city}
                    onChange={(e) => setShowForm({ ...showForm, city: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Venue</label>
                <input
                  className={fieldClass}
                  value={showForm.venue}
                  onChange={(e) => setShowForm({ ...showForm, venue: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  className={fieldClass}
                  value={showForm.address}
                  onChange={(e) => setShowForm({ ...showForm, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Currency</label>
                  <input
                    className={fieldClass}
                    value={showForm.currency}
                    onChange={(e) => setShowForm({ ...showForm, currency: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Price (cents)</label>
                  <input
                    className={fieldClass}
                    value={showForm.priceCents}
                    onChange={(e) => setShowForm({ ...showForm, priceCents: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input
                    className={fieldClass}
                    value={showForm.capacity}
                    onChange={(e) => setShowForm({ ...showForm, capacity: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={fieldClass}
                  value={showForm.status}
                  onChange={(e) => setShowForm({ ...showForm, status: e.target.value })}
                >
                  <option value="on_sale">On sale</option>
                  <option value="sold_out">Sold out</option>
                  <option value="coming_soon">Coming soon</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>External ticket URL (optional override)</label>
                <input
                  className={fieldClass}
                  value={showForm.externalTicketUrl}
                  onChange={(e) =>
                    setShowForm({ ...showForm, externalTicketUrl: e.target.value })
                  }
                  placeholder="Leave blank to use Stripe"
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-sm text-zinc-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showForm.featured}
                    onChange={(e) => setShowForm({ ...showForm, featured: e.target.checked })}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showForm.published}
                    onChange={(e) => setShowForm({ ...showForm, published: e.target.checked })}
                  />
                  Published
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-40"
                  style={{ background: '#FF6B35', color: '#0A0A0A' }}
                >
                  {editingShowId ? 'Update Show' : 'Create Show'}
                </button>
                {editingShowId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingShowId(null)
                      setShowForm(emptyShow(tours[0]?.id || ''))
                    }}
                    className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="space-y-3">
              {shows.length === 0 ? (
                <p className="text-sm text-zinc-500">No shows yet.</p>
              ) : (
                shows.map((show) => {
                  const d = formatShowDate(show.date)
                  return (
                    <div key={show.id} className="border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            {d.month} {d.day} · {show.country}
                          </p>
                          <h3 className="mt-1 font-semibold text-white">
                            {show.city} — {show.venue}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            {show.tour.title} · {formatPrice(show.priceCents, show.currency)} ·{' '}
                            {show.status}
                          </p>
                        </div>
                        {show.featured ? (
                          <span className="text-[9px] uppercase tracking-widest text-[#FF6B35]">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editShow(show)}
                          className="text-[10px] uppercase tracking-[0.18em] text-zinc-300 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleFeaturedShow(show)}
                          className="text-[10px] uppercase tracking-[0.18em] text-[#FF6B35]"
                        >
                          {show.featured ? 'Unfeature' : 'Make Featured'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeShow(show.id)}
                          className="text-[10px] uppercase tracking-[0.18em] text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
