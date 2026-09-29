'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ClipboardList, Download, RefreshCw, Search } from 'lucide-react'
import { formatShowDate } from '@/lib/format'
import { parseWallParts } from '@/lib/wallDate'
import type { PublicShow } from '@/lib/serialize'
import type { GuestListRow } from '@/lib/tickets/guestListPdf'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

/** Keep lists through the show day and the two calendar days after; then hide. */
const DAYS_AFTER_SHOW = 2

type GuestShow = {
  id: string
  city: string
  venue: string
  tour: string
  dateLabel: string
  timeLabel: string
}

function showOptionLabel(show: PublicShow) {
  const d = formatShowDate(show.date)
  return `${show.city} · ${show.venue}${d.day ? ` · ${d.day} ${d.month}` : ''}${
    show.tour?.title ? ` (${show.tour.title})` : ''
  }`
}

function daysUntilShow(iso: string | null | undefined) {
  const parts = parseWallParts(iso)
  if (!parts) return null
  const show = Date.UTC(parts.year, parts.month - 1, parts.day)
  const n = new Date()
  const today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())
  return Math.round((show - today) / 86400000)
}

function isGuestListActive(show: PublicShow) {
  const days = daysUntilShow(show.date)
  return days !== null && days >= -DAYS_AFTER_SHOW
}

export default function GuestListAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [shows, setShows] = useState<PublicShow[]>([])
  const [showId, setShowId] = useState('')
  const [loadingShows, setLoadingShows] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [show, setShow] = useState<GuestShow | null>(null)
  const [guests, setGuests] = useState<GuestListRow[]>([])
  const [totals, setTotals] = useState({ guests: 0, tickets: 0, comps: 0, allGuests: 0 })
  const [purchasedFrom, setPurchasedFrom] = useState('')
  const [purchasedTo, setPurchasedTo] = useState('')
  const [source, setSource] = useState<'all' | 'paid' | 'comp'>('all')
  const [guestQuery, setGuestQuery] = useState('')
  const [debouncedGuestQuery, setDebouncedGuestQuery] = useState('')
  const [includePast, setIncludePast] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const listRequest = useRef(0)

  const activeShows = useMemo(() => {
    const list = includePast ? shows : shows.filter(isGuestListActive)
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [shows, includePast])

  const filteredShows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeShows
    return activeShows.filter((s) => showOptionLabel(s).toLowerCase().includes(q))
  }, [activeShows, query])

  const selectedShow = shows.find((s) => s.id === showId) || null

  async function loadShows() {
    setLoadingShows(true)
    try {
      const res = await fetch('/api/admin/shows')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load shows')
      const list = ((data.shows || []) as PublicShow[]).filter(isGuestListActive)
      setShows((data.shows || []) as PublicShow[])
      if (!showId && list.length) {
        const next = [...list].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )[0]
        if (next) setShowId(next.id)
      } else if (showId && !list.some((s) => s.id === showId)) {
        const next = [...list].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )[0]
        setShowId(next?.id || '')
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load shows')
    } finally {
      setLoadingShows(false)
    }
  }

  async function loadList(id: string) {
    if (!id) {
      setShow(null)
      setGuests([])
      setTotals({ guests: 0, tickets: 0, comps: 0, allGuests: 0 })
      return
    }
    const requestId = ++listRequest.current
    setLoadingList(true)
    try {
      const res = await fetch(`/api/admin/guest-list?${listParams(id)}`)
      const data = await res.json()
      if (requestId !== listRequest.current) return
      if (!res.ok) throw new Error(data.error || 'Failed to load guest list')
      setShow(data.show || null)
      setGuests(data.guests || [])
      setTotals(data.totals || { guests: 0, tickets: 0, comps: 0, allGuests: 0 })
    } catch (err) {
      if (requestId !== listRequest.current) return
      onError(err instanceof Error ? err.message : 'Failed to load guest list')
      setGuests([])
    } finally {
      if (requestId === listRequest.current) setLoadingList(false)
    }
  }

  useEffect(() => {
    void loadShows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedGuestQuery(guestQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [guestQuery])

  useEffect(() => {
    if (showId) void loadList(showId)
    else {
      setShow(null)
      setGuests([])
      setTotals({ guests: 0, tickets: 0, comps: 0, allGuests: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId, purchasedFrom, purchasedTo, source, debouncedGuestQuery])

  function listParams(id: string) {
    const params = new URLSearchParams({ showId: id })
    if (purchasedFrom) params.set('from', purchasedFrom)
    if (purchasedTo) params.set('to', purchasedTo)
    if (source !== 'all') params.set('source', source)
    if (debouncedGuestQuery) params.set('q', debouncedGuestQuery)
    return params.toString()
  }

  function filtersActive() {
    return Boolean(purchasedFrom || purchasedTo || source !== 'all' || debouncedGuestQuery)
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  async function downloadFile(kind: 'pdf' | 'csv') {
    if (!showId || downloading || exportingCsv) return
    const setBusy = kind === 'pdf' ? setDownloading : setExportingCsv
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/guest-list/${kind}?${listParams(showId)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const header = res.headers.get('Content-Disposition') || ''
      const match = header.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] || (kind === 'csv' ? 'guest-list.csv' : 'guest-list.pdf')
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onMessage(kind === 'csv' ? 'Guest list spreadsheet downloaded' : 'Guest list PDF downloaded')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to download the list')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Guest List</h2>
          <p className="mt-1 max-w-xl text-sm text-white/40">
            Pick a show, filter who bought and when, then export that list. Purchase dates use the
            first sale, so an upgrade later still counts as the original purchase.
          </p>
        </div>
        <button
          type="button"
          disabled={loadingShows || loadingList || !showId}
          className={btnGhost}
          onClick={() => {
            void loadShows()
            if (showId) void loadList(showId)
          }}
        >
          <RefreshCw className="mr-1.5 inline h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="admin-card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div ref={pickerRef} className="relative">
            <label className={labelClass}>Show</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                className={`${inputClass} pl-9 pr-9`}
                value={pickerOpen ? query : selectedShow ? showOptionLabel(selectedShow) : query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPickerOpen(true)
                }}
                onFocus={() => {
                  setQuery('')
                  setPickerOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setPickerOpen(false)
                    setQuery('')
                    ;(e.target as HTMLInputElement).blur()
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const first = filteredShows[0]
                    if (first) {
                      setShowId(first.id)
                      setQuery('')
                      setPickerOpen(false)
                    }
                  }
                }}
                placeholder={loadingShows ? 'Loading shows…' : 'Search city, venue, or tour'}
                disabled={loadingShows}
                autoComplete="off"
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            </div>
            {pickerOpen ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-lg">
                {filteredShows.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-white/40">
                    {activeShows.length === 0
                      ? 'No current or upcoming shows.'
                      : 'No shows match that search.'}
                  </p>
                ) : (
                  filteredShows.map((s) => {
                    const active = s.id === showId
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm ${
                          active ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'
                        }`}
                        onClick={() => {
                          setShowId(s.id)
                          setQuery('')
                          setPickerOpen(false)
                        }}
                      >
                        {showOptionLabel(s)}
                      </button>
                    )
                  })
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={!showId || downloading || exportingCsv || loadingList}
              onClick={() => void downloadFile('csv')}
            >
              <Download className="mr-1.5 inline h-4 w-4" />
              {exportingCsv ? 'Preparing…' : 'Export CSV'}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!showId || downloading || exportingCsv || loadingList}
              onClick={() => void downloadFile('pdf')}
            >
              <Download className="mr-1.5 inline h-4 w-4" />
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="purchased-from">
              Purchased from
            </label>
            <input
              id="purchased-from"
              className={inputClass}
              type="date"
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="purchased-to">
              Purchased through
            </label>
            <input
              id="purchased-to"
              className={inputClass}
              type="date"
              value={purchasedTo}
              onChange={(e) => setPurchasedTo(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="guest-source">
              Type
            </label>
            <select
              id="guest-source"
              className={inputClass}
              value={source}
              onChange={(e) => setSource(e.target.value as 'all' | 'paid' | 'comp')}
            >
              <option value="all">All guests</option>
              <option value="paid">Paid only</option>
              <option value="comp">Complimentary only</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="guest-search">
              Name or email
            </label>
            <input
              id="guest-search"
              className={inputClass}
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
              placeholder="Search this show"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            Purchased through includes that whole day, Sydney time. For a date change, set it to the
            last day tickets were sold for the old date.
          </p>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
            Include past shows
          </label>
        </div>
        {filtersActive() ? (
          <button
            type="button"
            className={`${btnGhost} mt-2`}
            onClick={() => {
              setPurchasedFrom('')
              setPurchasedTo('')
              setSource('all')
              setGuestQuery('')
              setDebouncedGuestQuery('')
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {show ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: filtersActive() ? 'Matching guests' : 'Guests',
              value: filtersActive() ? `${totals.guests} of ${totals.allGuests}` : String(totals.guests),
            },
            { label: 'Tickets', value: String(totals.tickets) },
            { label: 'Complimentary', value: String(totals.comps) },
            { label: 'Show', value: show.dateLabel || '—' },
          ].map((card) => (
            <div key={card.label} className="admin-card p-5">
              <p className="truncate text-xl font-bold tabular-nums text-white" title={card.value}>
                {loadingList ? '—' : card.value}
              </p>
              <p className="mt-0.5 text-xs text-white/40">{card.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Guest</th>
              <th>Qty</th>
              <th className="hidden sm:table-cell">Class</th>
              <th className="hidden lg:table-cell">Purchased</th>
              <th className="hidden md:table-cell">Table</th>
              <th className="hidden sm:table-cell">Arrived</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loadingList ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-5 py-4">
                    <div className="h-4 animate-pulse rounded bg-white/5" />
                  </td>
                </tr>
              ))
            ) : !showId ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-white/40">
                  <ClipboardList className="mx-auto mb-2 h-5 w-5 text-white/25" />
                  Select a show to preview the guest list.
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-white/40">
                  {filtersActive() && totals.allGuests > 0
                    ? 'No guests match these filters.'
                    : 'No paid guests for this show yet.'}
                </td>
              </tr>
            ) : (
              guests.map((guest, index) => (
                <tr key={`${guest.email}-${guest.tierName}-${index}`}>
                  <td className="px-5 py-3 text-sm text-white/40">{index + 1}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-white">{guest.name}</p>
                    {guest.email && guest.email !== guest.name ? (
                      <p className="mt-0.5 text-xs text-white/40">{guest.email}</p>
                    ) : null}
                    {guest.source === 'comp' ? (
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-amber-400/80">
                        Comp
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-sm tabular-nums text-white/80">{guest.quantity}</td>
                  <td className="hidden px-5 py-3 text-sm text-white/70 sm:table-cell">
                    {guest.tierName}
                  </td>
                  <td className="hidden px-5 py-3 text-sm text-white/60 lg:table-cell">
                    {guest.purchasedAt
                      ? new Date(guest.purchasedAt).toLocaleString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="hidden px-5 py-3 text-sm text-white/70 md:table-cell">
                    {guest.tableLabel || '—'}
                  </td>
                  <td className="hidden px-5 py-3 text-sm text-white/50 sm:table-cell">
                    {guest.checkedIn >= guest.quantity
                      ? 'In'
                      : guest.checkedIn > 0
                        ? `${guest.checkedIn} of ${guest.quantity}`
                        : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
