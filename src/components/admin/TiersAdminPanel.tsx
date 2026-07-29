'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import type { PublicShow, PublicTicketTier, PublicTour } from '@/lib/serialize'
import { formatPrice } from '@/lib/format'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type TierForm = {
  ownerType: 'tour' | 'show'
  ownerId: string
  name: string
  slug: string
  description: string
  currency: string
  priceCents: string
  capacity: string
  sortOrder: string
  published: boolean
}

const emptyForm = (ownerType: 'tour' | 'show' = 'tour', ownerId = ''): TierForm => ({
  ownerType,
  ownerId,
  name: 'General Admission',
  slug: '',
  description: '',
  currency: 'AUD',
  priceCents: '7500',
  capacity: '0',
  sortOrder: '0',
  published: true,
})

export default function TiersAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [tours, setTours] = useState<PublicTour[]>([])
  const [shows, setShows] = useState<PublicShow[]>([])
  const [tiers, setTiers] = useState<PublicTicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TierForm>(emptyForm())
  const [filterType, setFilterType] = useState<'all' | 'tour' | 'show'>('all')

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

  const visible = useMemo(
    () => (filterType === 'all' ? tiers : tiers.filter((t) => t.ownerType === filterType)),
    [tiers, filterType],
  )

  function ownerCurrency(ownerType: 'tour' | 'show', ownerId: string) {
    if (ownerType === 'show') {
      return shows.find((s) => s.id === ownerId)?.currency || ''
    }
    return shows.find((s) => s.tour.id === ownerId)?.currency || ''
  }

  function ownerLabel(tier: PublicTicketTier) {
    if (tier.ownerType === 'tour') {
      const tour = tours.find((t) => t.id === tier.ownerId)
      return tour ? `Tour · ${tour.title}` : `Tour · ${tier.ownerId}`
    }
    const show = shows.find((s) => s.id === tier.ownerId)
    return show ? `Show · ${show.city} (${show.venue})` : `Show · ${tier.ownerId}`
  }

  function openCreate() {
    setEditingId(null)
    const ownerId = tours[0]?.id || ''
    const base = emptyForm('tour', ownerId)
    setForm({ ...base, currency: ownerCurrency('tour', ownerId) || base.currency })
    setShowForm(true)
  }

  function openEdit(tier: PublicTicketTier) {
    setEditingId(tier.id)
    setForm({
      ownerType: tier.ownerType,
      ownerId: tier.ownerId,
      name: tier.name,
      slug: tier.slug,
      description: tier.description,
      currency: tier.currency,
      priceCents: String(tier.priceCents),
      capacity: String(tier.capacity),
      sortOrder: String(tier.sortOrder),
      published: tier.published,
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const payload = {
        ...form,
        priceCents: Number(form.priceCents) || 0,
        capacity: Number(form.capacity) || 0,
        sortOrder: Number(form.sortOrder) || 0,
      }
      const res = await fetch(editingId ? `/api/admin/tiers/${editingId}` : '/api/admin/tiers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onMessage(editingId ? 'Tier updated.' : 'Tier created.')
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
    if (!confirm(`Delete tier “${tier.name}”?`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Tier deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const ownerOptions =
    form.ownerType === 'tour'
      ? tours.map((t) => ({ id: t.id, label: t.title }))
      : shows.map((s) => ({
          id: s.id,
          label: `${s.city} — ${s.venue} (${s.tour.title || 'Tour'})`,
        }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Ticket Tiers</h2>
          <p className="mt-1 text-sm text-white/40">
            Create pricing tiers for a whole tour (defaults) or a single show (overrides).
          </p>
        </div>
        <button type="button" disabled={busy} onClick={openCreate} className={btnPrimary}>
          <Plus className="mr-1.5 inline h-4 w-4" />
          New tier
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'tour', 'show'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilterType(id)}
            className={filterType === id ? btnPrimary : btnGhost}
          >
            {id === 'all' ? 'All' : id === 'tour' ? 'Tour tiers' : 'Show tiers'}
          </button>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={save} className="admin-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit tier' : 'Create tier'}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Assign to</label>
                <select
                  className={inputClass}
                  value={form.ownerType}
                  onChange={(e) => {
                    const ownerType = e.target.value as 'tour' | 'show'
                    const ownerId =
                      ownerType === 'tour' ? tours[0]?.id || '' : shows[0]?.id || ''
                    setForm((f) => ({
                      ...f,
                      ownerType,
                      ownerId,
                      currency: ownerCurrency(ownerType, ownerId) || f.currency,
                    }))
                  }}
                >
                  <option value="tour">Tour (applies to all shows without overrides)</option>
                  <option value="show">Individual show (overrides tour tiers)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {form.ownerType === 'tour' ? 'Tour' : 'Show'}
                </label>
                <select
                  className={inputClass}
                  value={form.ownerId}
                  onChange={(e) => {
                    const ownerId = e.target.value
                    setForm((f) => ({
                      ...f,
                      ownerId,
                      currency: ownerCurrency(f.ownerType, ownerId) || f.currency,
                    }))
                  }}
                  required
                >
                  {ownerOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40">
              {(() => {
                const current = tiers.find((t) => t.id === editingId)
                return current ? ownerLabel(current) : 'Editing tier'
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
              <label className={labelClass}>Price (cents)</label>
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
              <label className={labelClass}>Currency</label>
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
                Buyers always see this currency (e.g. a €50 show shows €50 worldwide). Stripe
                Checkout offers their home currency automatically.
              </p>
            </div>
            <div>
              <label className={labelClass}>Capacity (0 = unlimited)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
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

          <label className="inline-flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
            />
            Published
          </label>

          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create tier'}
          </button>
        </form>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Library</h3>
          <span className="text-xs text-white/40">{visible.length} tiers</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/40">
            <Layers className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No tiers yet. Create GA / VIP pricing for a tour or show.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map((tier) => (
              <div key={tier.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{tier.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {ownerLabel(tier)} · {formatPrice(tier.priceCents, tier.currency)} ·{' '}
                    {tier.published ? 'Published' : 'Draft'}
                    {tier.capacity > 0 ? ` · ${tier.ticketsSold}/${tier.capacity} sold` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => openEdit(tier)} className={btnSecondary}>
                    Edit
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(tier)} className={btnDanger}>
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
