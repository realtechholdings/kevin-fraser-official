'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Plus,
  Star,
  Ticket,
  XCircle,
} from 'lucide-react'
import type { PublicShow, PublicTour } from '@/lib/serialize'
import { formatPrice, formatShowDate } from '@/lib/format'
import AdminSidebar, { type AdminTab } from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import BonusAdminPanel from '@/components/admin/BonusAdminPanel'
import StudioAdminPanel from '@/components/admin/StudioAdminPanel'
import ThemeAdminPanel from '@/components/admin/ThemeAdminPanel'
import AIKevAdminPanel from '@/components/admin/AIKevAdminPanel'
import { cn } from '@/lib/utils'

type Tab = AdminTab

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

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    on_sale: {
      label: 'On sale',
      className: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle,
    },
    coming_soon: {
      label: 'Coming soon',
      className: 'text-amber-400 bg-amber-400/10',
      icon: Clock,
    },
    sold_out: {
      label: 'Sold out',
      className: 'text-red-400 bg-red-500/10',
      icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'text-white/30 bg-white/5',
      icon: XCircle,
    },
    published: {
      label: 'Published',
      className: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle,
    },
    draft: {
      label: 'Draft',
      className: 'text-white/40 bg-white/5',
      icon: Clock,
    },
  }
  const meta = map[status] || map.draft
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

export default function AdminPortal() {
  const [tours, setTours] = useState<PublicTour[]>([])
  const [shows, setShows] = useState<PublicShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
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

  const upcomingShows = useMemo(
    () => shows.filter((s) => new Date(s.date).getTime() >= Date.now() - 6 * 60 * 60 * 1000),
    [shows]
  )
  const onSaleCount = upcomingShows.filter((s) => s.status === 'on_sale').length
  const featuredTour = tours.find((t) => t.featured)

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

  function openCreate(target: 'tours' | 'shows') {
    setTab(target)
    if (target === 'tours') {
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

  const headerCopy =
    tab === 'overview'
      ? { title: 'Overview', subtitle: 'Tours, shows, and ticket inventory at a glance' }
      : tab === 'tours'
        ? { title: 'Tours', subtitle: 'Create and feature headline tours' }
        : tab === 'shows'
          ? { title: 'Shows', subtitle: 'Manage upcoming dates and ticket status' }
          : tab === 'bonus'
            ? { title: 'Bonus Content', subtitle: 'Upload exclusive Showreel clips to Cloudflare R2' }
            : tab === 'studio'
              ? { title: 'The Studio', subtitle: 'Behind the scenes, characters, and creative process' }
              : tab === 'theme'
                ? { title: 'Theme', subtitle: 'Site accent colours for light and dark mode' }
                : { title: 'AI Kev', subtitle: 'Avatar, greeting, prompt, and speaking style' }

  return (
    <div className="admin-app">
      <AdminSidebar tab={tab} onTabChange={(next) => { setTab(next); setShowFormPanel(false) }} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader title={headerCopy.title} subtitle={headerCopy.subtitle} />

        <main className="admin-main flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl">
          <div className="mb-5 flex gap-2 md:hidden">
            {(['overview', 'tours', 'shows', 'bonus', 'studio', 'theme', 'ai'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setShowFormPanel(false)
                }}
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-medium capitalize',
                  tab === id ? 'admin-nav-item is-active' : 'admin-nav-item'
                )}
                style={{ width: 'auto' }}
              >
                {id === 'bonus'
                  ? 'Bonus'
                  : id === 'studio'
                    ? 'Studio'
                    : id === 'ai'
                      ? 'AI Kev'
                      : id}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          {tab === 'overview' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Overview</h2>
                  <p className="mt-1 text-sm text-white/40">
                    {featuredTour
                      ? `Featured tour: ${featuredTour.title}`
                      : 'No featured tour yet — seed Decadance or create one.'}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={seedDecadance} className={btnSecondary}>
                  Seed Decadance
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Tours', value: tours.length, icon: Ticket, tone: 'bg-violet-500/10 text-violet-400' },
                  { label: 'Upcoming shows', value: upcomingShows.length, icon: CalendarDays, tone: 'bg-sky-500/10 text-sky-400' },
                  { label: 'On sale', value: onSaleCount, icon: CheckCircle, tone: 'bg-emerald-500/10 text-emerald-400' },
                  { label: 'Featured shows', value: shows.filter((s) => s.featured).length, icon: Star, tone: 'bg-amber-500/10 text-amber-400' },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="admin-card p-5"
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {loading ? '—' : card.value}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">{card.label}</p>
                  </div>
                ))}
              </div>

              <section className="admin-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                  <h3 className="text-sm font-semibold text-white">Next shows</h3>
                  <button type="button" onClick={() => setTab('shows')} className={btnGhost}>
                    View all
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-3 p-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
                    ))}
                  </div>
                ) : upcomingShows.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-white/40">
                    No upcoming shows. Seed Decadance or create a show.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {upcomingShows.slice(0, 6).map((show) => {
                      const d = formatShowDate(show.date)
                      return (
                        <div key={show.id} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {show.city} — {show.venue}
                            </p>
                            <p className="mt-0.5 text-xs text-white/40">
                              {d.day} {d.month} · {show.country} · {formatPrice(show.priceCents, show.currency)}
                            </p>
                          </div>
                          <StatusBadge status={show.status} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {tab === 'tours' || tab === 'shows' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {tab === 'tours' ? 'Tours' : 'Shows'}
                  </h2>
                  <p className="mt-1 text-sm text-white/40">
                    {tab === 'tours'
                      ? `${tours.length} tour${tours.length === 1 ? '' : 's'} on the platform`
                      : `${shows.length} show${shows.length === 1 ? '' : 's'} scheduled`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tab === 'tours' ? (
                    <button type="button" disabled={busy} onClick={seedDecadance} className={btnSecondary}>
                      Seed Decadance
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openCreate(tab)}
                    className={btnPrimary}
                  >
                    <Plus className="h-4 w-4" />
                    {tab === 'tours' ? 'New tour' : 'New show'}
                  </button>
                </div>
              </div>

              {showFormPanel ? (
                <section className="admin-card space-y-4 p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">
                      {tab === 'tours'
                        ? editingTourId
                          ? 'Edit tour'
                          : 'Create tour'
                        : editingShowId
                          ? 'Edit show'
                          : 'Create show'}
                    </h3>
                    <button type="button" onClick={closeForm} className="text-sm text-white/40 hover:text-white/70">
                      Close
                    </button>
                  </div>

                  {tab === 'tours' ? (
                    <form onSubmit={saveTour} className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
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
                      <div className="md:col-span-2">
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
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={tourForm.featured}
                            onChange={(e) => setTourForm({ ...tourForm, featured: e.target.checked })}
                          />
                          Featured
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={tourForm.published}
                            onChange={(e) => setTourForm({ ...tourForm, published: e.target.checked })}
                          />
                          Published
                        </label>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {editingTourId ? 'Save changes' : 'Create tour'}
                        </button>
                        <button type="button" onClick={closeForm} className={btnSecondary}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={saveShow} className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tour</label>
                        <select
                          className={inputClass}
                          value={showForm.tourId}
                          onChange={(e) => setShowForm({ ...showForm, tourId: e.target.value })}
                          required
                        >
                          <option value="">Select tour</option>
                          {tourOptions.map((t) => (
                            <option key={t.id} value={t.id} className="bg-[#141420]">
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
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
                          <option value="on_sale" className="bg-[#141420]">On sale</option>
                          <option value="sold_out" className="bg-[#141420]">Sold out</option>
                          <option value="coming_soon" className="bg-[#141420]">Coming soon</option>
                          <option value="cancelled" className="bg-[#141420]">Cancelled</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
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
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={showForm.featured}
                            onChange={(e) => setShowForm({ ...showForm, featured: e.target.checked })}
                          />
                          Featured
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={showForm.published}
                            onChange={(e) => setShowForm({ ...showForm, published: e.target.checked })}
                          />
                          Published
                        </label>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {editingShowId ? 'Save changes' : 'Create show'}
                        </button>
                        <button type="button" onClick={closeForm} className={btnSecondary}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              ) : null}

              {tab === 'tours' ? (
                <div className="admin-card overflow-hidden">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>
                          Tour
                        </th>
                        <th className="hidden md:table-cell">
                          Status
                        </th>
                        <th className="hidden lg:table-cell">
                          Featured
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={4} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-white/5" />
                            </td>
                          </tr>
                        ))
                      ) : tours.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center text-sm text-white/40">
                            No tours yet. Seed Decadance or create one.
                          </td>
                        </tr>
                      ) : (
                        tours.map((tour) => (
                          <tr key={tour.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-xs font-bold text-violet-300">
                                  {tour.title.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{tour.title}</p>
                                  <p className="text-xs text-white/40">{tour.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-5 py-4 md:table-cell">
                              <StatusBadge status={tour.published ? 'published' : 'draft'} />
                            </td>
                            <td className="hidden px-5 py-4 lg:table-cell">
                              {tour.featured ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                                  <Star className="h-3 w-3" />
                                  Featured
                                </span>
                              ) : (
                                <span className="text-xs text-white/25">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-card overflow-hidden">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>
                          Date
                        </th>
                        <th>
                          City / Venue
                        </th>
                        <th className="hidden lg:table-cell">
                          Price
                        </th>
                        <th className="hidden md:table-cell">
                          Status
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-white/5" />
                            </td>
                          </tr>
                        ))
                      ) : shows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-white/40">
                            No shows yet. Create one after adding a tour.
                          </td>
                        </tr>
                      ) : (
                        shows.map((show) => {
                          const d = formatShowDate(show.date)
                          return (
                            <tr key={show.id} className="transition-colors hover:bg-white/[0.02]">
                              <td className="whitespace-nowrap px-5 py-4">
                                <p className="text-sm font-medium text-white">
                                  {d.day} {d.month}
                                </p>
                                <p className="text-xs text-white/40">{d.weekday}</p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-white">
                                  {show.city}
                                  {show.featured ? (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                                      Featured
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-white/40">
                                  {show.venue} · {show.country}
                                </p>
                              </td>
                              <td className="hidden whitespace-nowrap px-5 py-4 text-sm text-white/70 lg:table-cell">
                                {formatPrice(show.priceCents, show.currency)}
                              </td>
                              <td className="hidden px-5 py-4 md:table-cell">
                                <StatusBadge status={show.status} />
                              </td>
                              <td className="px-5 py-4">
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
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {tab === 'bonus' ? (
            <BonusAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'studio' ? (
            <StudioAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'theme' ? (
            <ThemeAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}

          {tab === 'ai' ? (
            <AIKevAdminPanel
              onMessage={(msg) => {
                setMessage(msg)
                setError('')
              }}
              onError={(msg) => {
                setError(msg)
                setMessage('')
              }}
            />
          ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
