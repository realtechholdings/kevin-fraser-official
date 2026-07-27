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

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700'
const btnPrimary =
  'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50'
const btnSecondary =
  'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const btnGhost =
  'text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50'
const btnDanger = 'text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50'

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky-50 text-sky-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'neutral' {
  if (status === 'on_sale') return 'green'
  if (status === 'coming_soon') return 'amber'
  if (status === 'sold_out' || status === 'cancelled') return 'red'
  return 'neutral'
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
  const [showFormPanel, setShowFormPanel] = useState(false)

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
      setShowFormPanel(false)
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
      setShowFormPanel(false)
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
    setShowFormPanel(true)
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
    setShowFormPanel(true)
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

  function openCreate() {
    if (tab === 'tours') {
      setEditingTourId(null)
      setTourForm(emptyTour)
    } else {
      setEditingShowId(null)
      setShowForm(emptyShow(tours[0]?.id || ''))
    }
    setShowFormPanel(true)
  }

  function closeForm() {
    setShowFormPanel(false)
    setEditingTourId(null)
    setEditingShowId(null)
    setTourForm(emptyTour)
    setShowForm(emptyShow(tours[0]?.id || ''))
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Kevin Fraser Official</p>
              <h1 className="text-lg font-semibold text-slate-900">Admin</h1>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => {
                  setTab('tours')
                  setShowFormPanel(false)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === 'tours'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tours
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('shows')
                  setShowFormPanel(false)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === 'shows'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Shows
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/worlds/stage" className={`${btnGhost} hidden sm:inline`}>
              View Stage
            </Link>
            <Link href="/" className={`${btnGhost} hidden sm:inline`}>
              Site
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('tours')
                setShowFormPanel(false)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === 'tours' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Tours
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('shows')
                setShowFormPanel(false)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === 'shows' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              Shows
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {tab === 'tours' ? 'Tours' : 'Shows'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tab === 'tours'
                ? `${tours.length} tour${tours.length === 1 ? '' : 's'}`
                : `${shows.length} show${shows.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={seedDecadance} className={btnSecondary}>
              Seed Decadance
            </button>
            <button type="button" onClick={openCreate} className={btnPrimary}>
              {tab === 'tours' ? 'New tour' : 'New show'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {showFormPanel ? (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {tab === 'tours'
                  ? editingTourId
                    ? 'Edit tour'
                    : 'Create tour'
                  : editingShowId
                    ? 'Edit show'
                    : 'Create show'}
              </h3>
              <button type="button" onClick={closeForm} className={btnGhost}>
                Close
              </button>
            </div>

            {tab === 'tours' ? (
              <form onSubmit={saveTour} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    value={tourForm.title}
                    onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <input
                    className={inputClass}
                    value={tourForm.slug}
                    onChange={(e) => setTourForm({ ...tourForm, slug: e.target.value })}
                    placeholder="Generated from title if empty"
                  />
                </div>
                <div>
                  <label className={labelClass}>Subtitle</label>
                  <input
                    className={inputClass}
                    value={tourForm.subtitle}
                    onChange={(e) => setTourForm({ ...tourForm, subtitle: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea
                    className={`${inputClass} min-h-[110px]`}
                    value={tourForm.description}
                    onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Start</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={tourForm.startDate}
                    onChange={(e) => setTourForm({ ...tourForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>End</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={tourForm.endDate}
                    onChange={(e) => setTourForm({ ...tourForm, endDate: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={tourForm.featured}
                      onChange={(e) => setTourForm({ ...tourForm, featured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={tourForm.published}
                      onChange={(e) => setTourForm({ ...tourForm, published: e.target.checked })}
                    />
                    Published
                  </label>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={busy} className={btnPrimary}>
                    {editingTourId ? 'Save changes' : 'Create tour'}
                  </button>
                  <button type="button" onClick={closeForm} className={btnSecondary}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveShow} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Tour</label>
                  <select
                    className={inputClass}
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
                <div className="sm:col-span-2">
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    value={showForm.title}
                    onChange={(e) => setShowForm({ ...showForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Date & time</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={showForm.date}
                    onChange={(e) => setShowForm({ ...showForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Show time label</label>
                  <input
                    className={inputClass}
                    value={showForm.showTime}
                    onChange={(e) => setShowForm({ ...showForm, showTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    className={inputClass}
                    value={showForm.country}
                    onChange={(e) => setShowForm({ ...showForm, country: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    value={showForm.city}
                    onChange={(e) => setShowForm({ ...showForm, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Venue</label>
                  <input
                    className={inputClass}
                    value={showForm.venue}
                    onChange={(e) => setShowForm({ ...showForm, venue: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    className={inputClass}
                    value={showForm.address}
                    onChange={(e) => setShowForm({ ...showForm, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <input
                    className={inputClass}
                    value={showForm.currency}
                    onChange={(e) => setShowForm({ ...showForm, currency: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Price (cents)</label>
                  <input
                    className={inputClass}
                    value={showForm.priceCents}
                    onChange={(e) => setShowForm({ ...showForm, priceCents: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input
                    className={inputClass}
                    value={showForm.capacity}
                    onChange={(e) => setShowForm({ ...showForm, capacity: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={inputClass}
                    value={showForm.status}
                    onChange={(e) => setShowForm({ ...showForm, status: e.target.value })}
                  >
                    <option value="on_sale">On sale</option>
                    <option value="sold_out">Sold out</option>
                    <option value="coming_soon">Coming soon</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>External ticket URL (optional)</label>
                  <input
                    className={inputClass}
                    value={showForm.externalTicketUrl}
                    onChange={(e) =>
                      setShowForm({ ...showForm, externalTicketUrl: e.target.value })
                    }
                    placeholder="Leave blank to use Stripe Checkout"
                  />
                </div>
                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={showForm.featured}
                      onChange={(e) => setShowForm({ ...showForm, featured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={showForm.published}
                      onChange={(e) => setShowForm({ ...showForm, published: e.target.checked })}
                    />
                    Published
                  </label>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={busy} className={btnPrimary}>
                    {editingShowId ? 'Save changes' : 'Create show'}
                  </button>
                  <button type="button" onClick={closeForm} className={btnSecondary}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500 shadow-sm">
            Loading…
          </div>
        ) : tab === 'tours' ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {tours.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No tours yet. Create one or seed Decadance.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tour</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Featured</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tours.map((tour) => (
                      <tr key={tour.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{tour.title}</div>
                          <div className="text-xs text-slate-500">{tour.slug}</div>
                          {tour.subtitle ? (
                            <div className="mt-0.5 text-xs text-slate-500">{tour.subtitle}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={tour.published ? 'green' : 'neutral'}>
                            {tour.published ? 'Published' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {tour.featured ? <Badge tone="blue">Featured</Badge> : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => editTour(tour)} className={btnGhost}>
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleFeaturedTour(tour)}
                              className={btnGhost}
                            >
                              {tour.featured ? 'Unfeature' : 'Feature'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeTour(tour.id)}
                              className={btnDanger}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {shows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No shows yet. Create one after adding a tour.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">City / Venue</th>
                      <th className="px-4 py-3">Tour</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shows.map((show) => {
                      const d = formatShowDate(show.date)
                      return (
                        <tr key={show.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {d.day} {d.month}
                            </div>
                            <div className="text-xs text-slate-500">{d.weekday}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {show.city}
                              {show.featured ? (
                                <span className="ml-2">
                                  <Badge tone="blue">Featured</Badge>
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500">
                              {show.venue}
                              {show.country ? ` · ${show.country}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{show.tour.title || '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {formatPrice(show.priceCents, show.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={statusTone(show.status)}>
                              {show.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-3">
                              <button type="button" onClick={() => editShow(show)} className={btnGhost}>
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => toggleFeaturedShow(show)}
                                className={btnGhost}
                              >
                                {show.featured ? 'Unfeature' : 'Feature'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => removeShow(show.id)}
                                className={btnDanger}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
