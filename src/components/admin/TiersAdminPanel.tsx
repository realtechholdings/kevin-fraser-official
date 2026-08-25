'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { PublicShow, PublicTicketTier, PublicTour } from '@/lib/serialize'
import { formatPriceWithAud } from '@/lib/fx'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import ImageCropField from '@/components/admin/ImageCropField'
import AudHint from '@/components/admin/AudHint'
import { useAudRates } from '@/components/admin/useAudRates'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type TierForm = {
  ownerId: string
  name: string
  slug: string
  description: string
  currency: string
  priceCents: string
  capacity: string
  sortOrder: string
  published: boolean
  soldOut: boolean
  ticketAccent: string
  ticketArtwork: string
  ticketArtworkKey: string
}

const emptyForm = (ownerId = ''): TierForm => ({
  ownerId,
  name: 'General Admission',
  slug: '',
  description: '',
  currency: 'AUD',
  priceCents: '7500',
  capacity: '0',
  sortOrder: '0',
  published: true,
  soldOut: false,
  ticketAccent: '',
  ticketArtwork: '',
  ticketArtworkKey: '',
})

async function uploadTierImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', 'tiers')
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Image upload failed')
  if (!data.key) throw new Error('Upload did not return a storage key.')
  return {
    key: data.key as string,
    publicUrl: (data.publicUrl as string) || '',
  }
}

export default function TiersAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const audRates = useAudRates()
  const [tours, setTours] = useState<PublicTour[]>([])
  const [shows, setShows] = useState<PublicShow[]>([])
  const [tiers, setTiers] = useState<PublicTicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TierForm>(emptyForm())
  const [tourFilter, setTourFilter] = useState<string>('all')

  async function load() {
    setLoading(true)
    try {
      const [tRes, sRes, tierRes] = await Promise.all([
        fetch('/api/admin/tours'),
        fetch('/api/admin/shows'),
        fetch('/api/admin/tiers'),
      ])
      const tData = await tRes.json()
      const sData = await sRes.json()
      const tierData = await tierRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Failed to load tours')
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load shows')
      if (!tierRes.ok) throw new Error(tierData.error || 'Failed to load tiers')
      setTours(tData.tours || [])
      setShows(sData.shows || [])
      setTiers(tierData.tiers || [])
      if (!form.ownerId && tData.tours?.[0]) {
        setForm((f) => ({ ...f, ownerId: tData.tours[0].id }))
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load tiers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Tour-level definitions only — show price overrides live on the Show form. */
  const tourTiers = useMemo(
    () => tiers.filter((t) => t.ownerType === 'tour'),
    [tiers],
  )

  const visible = useMemo(
    () =>
      tourFilter === 'all'
        ? tourTiers
        : tourTiers.filter((t) => t.ownerId === tourFilter),
    [tourTiers, tourFilter],
  )

  function tourCurrency(tourId: string) {
    return shows.find((s) => s.tour.id === tourId)?.currency || ''
  }

  function ownerLabel(tier: PublicTicketTier) {
    const tour = tours.find((t) => t.id === tier.ownerId)
    return tour ? tour.title : `Tour · ${tier.ownerId}`
  }

  function openCreate() {
    setEditingId(null)
    const ownerId = tours[0]?.id || ''
    const base = emptyForm(ownerId)
    setForm({ ...base, currency: tourCurrency(ownerId) || base.currency })
    setShowForm(true)
  }

  function openEdit(tier: PublicTicketTier) {
    if (tier.ownerType !== 'tour') {
      onError('Per-show price overrides are edited on the Show form, not here.')
      return
    }
    setEditingId(tier.id)
    setForm({
      ownerId: tier.ownerId,
      name: tier.name,
      slug: tier.slug,
      description: tier.description,
      currency: tier.currency,
      priceCents: String(tier.priceCents),
      capacity: String(tier.capacity),
      sortOrder: String(tier.sortOrder),
      published: tier.published,
      soldOut: Boolean(tier.soldOut),
      ticketAccent: tier.ticketAccent || '',
      ticketArtwork: tier.ticketArtwork || '',
      ticketArtworkKey: tier.ticketArtworkKey || '',
    })
    setShowForm(true)
  }

  async function onTierArtworkChange(file: File | null) {
    if (!file) return
    setBusy(true)
    onError('')
    try {
      const uploaded = await uploadTierImage(file)
      setForm((prev) => ({
        ...prev,
        ticketArtworkKey: uploaded.key,
        ticketArtwork: uploaded.publicUrl || URL.createObjectURL(file),
      }))
      onMessage('Tier ticket artwork uploaded. Save the tier to keep it.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const payload = {
        ownerType: 'tour' as const,
        ownerId: form.ownerId,
        name: form.name,
        slug: form.slug,
        description: form.description,
        currency: form.currency,
        priceCents: Number(form.priceCents) || 0,
        capacity: Number(form.capacity) || 0,
        sortOrder: Number(form.sortOrder) || 0,
        published: form.published,
        soldOut: form.soldOut,
        ticketAccent: form.ticketAccent,
        ticketArtwork: form.ticketArtwork.startsWith('blob:') ? '' : form.ticketArtwork,
        ticketArtworkKey: form.ticketArtworkKey,
      }
      const res = await fetch(editingId ? `/api/admin/tiers/${editingId}` : '/api/admin/tiers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onMessage(editingId ? 'Tour tier updated.' : 'Tour tier created.')
      setShowForm(false)
      setEditingId(null)
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(tier: PublicTicketTier) {
    if (!confirm(`Delete tour tier “${tier.name}”? Shows will stop offering this class.`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Tour tier deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Ticket Tiers</h2>
          <p className="mt-1 max-w-xl text-sm text-white/40">
            Define GA / VIP once per tour. On each show, optionally override price and currency
            under Shows → Ticket tiers — allocation & pricing — you don&apos;t recreate tiers per
            date.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || tours.length === 0}
          onClick={openCreate}
          className={btnPrimary}
        >
          <Plus className="mr-1.5 inline h-4 w-4" />
          New tour tier
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTourFilter('all')}
          className={tourFilter === 'all' ? btnPrimary : btnGhost}
        >
          All tours
        </button>
        {tours.map((tour) => (
          <button
            key={tour.id}
            type="button"
            onClick={() => setTourFilter(tour.id)}
            className={tourFilter === tour.id ? btnPrimary : btnGhost}
          >
            {tour.title}
          </button>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={save} className="admin-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit tour tier' : 'Create tour tier'}
            </h3>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              Cancel
            </button>
          </div>

          {!editingId ? (
            <div>
              <label className={labelClass}>Tour</label>
              <select
                className={inputClass}
                value={form.ownerId}
                onChange={(e) => {
                  const ownerId = e.target.value
                  setForm((f) => ({
                    ...f,
                    ownerId,
                    currency: tourCurrency(ownerId) || f.currency,
                  }))
                }}
                required
              >
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-white/40">
              {(() => {
                const current = tiers.find((t) => t.id === editingId)
                return current ? `Tour · ${ownerLabel(current)}` : 'Editing tour tier'
              })()}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Tier name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Slug (optional)</label>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="general-admission"
              />
            </div>
            <div>
              <label className={labelClass}>Default price (cents)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.priceCents}
                onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Default currency</label>
              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                required
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-white/35">
                Shows inherit this unless you override price on the show. AUD is the admin base
                currency.
              </p>
              <AudHint cents={form.priceCents} currency={form.currency} />
            </div>
            <div>
              <label className={labelClass}>Default capacity hint (0 = unlimited)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
              <p className="mt-1.5 text-xs text-white/35">
                Per-show allocation is set on each show (recommended).
              </p>
            </div>
            <div>
              <label className={labelClass}>Sort order</label>
              <input
                className={inputClass}
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
              Ticket branding (optional)
            </p>
            <p className="mb-4 text-xs text-white/35">
              Used on PDFs for this class across the tour (e.g. VIP vs GA).
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Ticket accent colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(form.ticketAccent) ? form.ticketAccent : '#FF6600'
                    }
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ticketAccent: e.target.value.toUpperCase() }))
                    }
                    disabled={busy}
                  />
                  <input
                    className={inputClass}
                    value={form.ticketAccent}
                    onChange={(e) => setForm((f) => ({ ...f, ticketAccent: e.target.value }))}
                    placeholder="#FF6600 or blank"
                  />
                </div>
                {form.ticketAccent ? (
                  <button
                    type="button"
                    className={`${btnGhost} mt-2`}
                    onClick={() => setForm((f) => ({ ...f, ticketAccent: '' }))}
                  >
                    Clear accent
                  </button>
                ) : null}
              </div>
              <div>
                <ImageCropField
                  label="Ticket artwork"
                  preset="ticketArt"
                  currentUrl={
                    form.ticketArtwork ||
                    (form.ticketArtworkKey && editingId
                      ? `/api/tiers/${editingId}/ticket-artwork`
                      : '')
                  }
                  disabled={busy}
                  onCropped={(file) => void onTierArtworkChange(file)}
                  onRemoveCurrent={() =>
                    setForm((f) => ({ ...f, ticketArtwork: '', ticketArtworkKey: '' }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.soldOut}
                onChange={(e) => setForm((f) => ({ ...f, soldOut: e.target.checked }))}
              />
              Sold out (tour default)
            </label>
          </div>

          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create tour tier'}
          </button>
        </form>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Tour tier library</h3>
            <p className="text-xs text-white/35">
              Show-level price overrides are not listed here — edit them on each show.
            </p>
          </div>
          <span className="text-xs text-white/40">{visible.length} tiers</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/40">
            Create a tour first, then add GA / VIP tiers here.
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/40">
            <Layers className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No tour tiers yet. Create GA / VIP once — every show on the tour inherits them.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map((tier) => (
              <div key={tier.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{tier.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {ownerLabel(tier)} · {formatPriceWithAud(tier.priceCents, tier.currency, audRates)} ·{' '}
                    {tier.published ? 'Published' : 'Draft'}
                    {tier.soldOut ? ' · Sold out' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEdit(tier)}
                    className={btnSecondary}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(tier)}
                    className={btnDanger}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
