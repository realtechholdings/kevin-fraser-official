'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  Download,
  ExternalLink,
  Mail,
  ScanLine,
  Search,
  Ticket,
  RefreshCw,
  X,
} from 'lucide-react'
import { formatPrice, formatShowDate } from '@/lib/format'
import { formatPriceWithAud, foreignToAudCents } from '@/lib/fx'
import { parseWallParts } from '@/lib/wallDate'
import { useAudRates } from '@/components/admin/useAudRates'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

type TimelineId = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

const TIMELINES: { id: TimelineId; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom range' },
]

type AdminOrder = {
  id: string
  createdAt: string | null
  email: string
  quantity: number
  tierName: string
  tableQuantity?: number
  tableSeats?: number
  tableNames?: string[]
  amountTotal: number
  currency: string
  status: string
  checkedInCount: number
  stripePaymentIntentId: string
  stripeUrl: string
  source?: string
  holderName?: string
  confirmationEmailSentAt?: string | null
  show: { id: string; city: string; venue: string; date: string | null; tour: string } | null
}

type SalesShowTier = {
  id: string
  name: string
  kind: 'ticket' | 'table'
  seats: number
  capacity: number
  ticketsSold: number
  priceCents: number
  currency: string
  soldOut: boolean
}

type SalesShow = {
  id: string
  label: string
  city: string
  venue: string
  date: string | null
  status: string
  capacity: number
  ticketsSold: number
  currency: string
  tour: string
  published: boolean
  tiers: SalesShowTier[]
}

function downloadBase64Pdf(filename: string, base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function tableCount(order: AdminOrder) {
  if ((order.tableQuantity || 0) > 0) return order.tableQuantity || 0
  return order.tableNames?.length || 0
}

function purchaseQtyLabel(order: AdminOrder) {
  const tables = tableCount(order)
  if (tables > 0) {
    return `${tables} × ${order.tierName} (${tables === 1 ? 'table' : 'tables'})`
  }
  return `${order.quantity} × ${order.tierName}`
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'text-emerald-400 bg-emerald-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
  refunded: 'text-sky-400 bg-sky-400/10',
  cancelled: 'text-white/30 bg-white/5',
}

const SHOW_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  on_sale: { label: 'On sale', className: 'text-emerald-400 bg-emerald-400/10' },
  coming_soon: { label: 'Coming soon', className: 'text-amber-400 bg-amber-400/10' },
  sold_out: { label: 'Sold out', className: 'text-red-400 bg-red-500/10' },
  cancelled: { label: 'Cancelled', className: 'text-white/30 bg-white/5' },
}

function orderDateLabel(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toDateInput(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timelineRange(
  timeline: TimelineId,
  customFrom: string,
  customTo: string,
): { from: Date | null; to: Date | null; label: string } {
  const now = new Date()
  const today = startOfLocalDay(now)
  const meta = TIMELINES.find((t) => t.id === timeline)?.label || 'All time'
  if (timeline === 'today') return { from: today, to: null, label: meta }
  if (timeline === '7d') {
    return { from: new Date(today.getTime() - 6 * 86400000), to: null, label: meta }
  }
  if (timeline === '30d') {
    return { from: new Date(today.getTime() - 29 * 86400000), to: null, label: meta }
  }
  if (timeline === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null, label: meta }
  }
  if (timeline === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null
    const fromOk = from && !Number.isNaN(from.getTime()) ? from : null
    const toOk = to && !Number.isNaN(to.getTime()) ? to : null
    return { from: fromOk, to: toOk, label: meta }
  }
  return { from: null, to: null, label: meta }
}

function windowDayCount(from: Date | null, to: Date | null) {
  const end = startOfLocalDay(to || new Date())
  const start = startOfLocalDay(from || end)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

function daysUntilShow(iso: string | null) {
  const parts = parseWallParts(iso)
  if (!parts) return null
  const show = Date.UTC(parts.year, parts.month - 1, parts.day)
  const n = new Date()
  const today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())
  return Math.round((show - today) / 86400000)
}

function showWhenLabel(iso: string | null) {
  const days = daysUntilShow(iso)
  if (days === null) return ''
  if (days > 1) return `${days} days out`
  if (days === 1) return 'Tomorrow'
  if (days === 0) return 'Today'
  if (days === -1) return 'Yesterday'
  return `${Math.abs(days)} days ago`
}

function inventoryOf(show: SalesShow) {
  const classes = show.tiers.filter((t) => t.kind !== 'table')
  const tables = show.tiers.filter((t) => t.kind === 'table')
  const classCap = classes.reduce((sum, t) => sum + (t.capacity || 0), 0)
  const classSold = classes.reduce((sum, t) => sum + (t.ticketsSold || 0), 0)
  const cap = show.capacity > 0 ? show.capacity : classCap
  const sold = show.ticketsSold > 0 ? show.ticketsSold : classSold
  return {
    cap,
    sold,
    remaining: cap > 0 ? Math.max(0, cap - sold) : null,
    pct: cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : null,
    classes,
    tables,
  }
}

function sortShows(shows: SalesShow[]) {
  const today = startOfLocalDay().getTime()
  return [...shows].sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0
    const bd = b.date ? new Date(b.date).getTime() : 0
    const aUp = ad >= today
    const bUp = bd >= today
    if (aUp !== bUp) return aUp ? -1 : 1
    return aUp ? ad - bd : bd - ad
  })
}

function dailyTicketBars(orders: AdminOrder[], from: Date | null, to: Date | null) {
  const paid = orders.filter((o) => o.status === 'paid' && o.createdAt)
  const end = startOfLocalDay(to || new Date())
  let start = from ? startOfLocalDay(from) : new Date(end.getTime() - 13 * 86400000)
  const maxDays = 30
  const span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (span > maxDays) start = new Date(end.getTime() - (maxDays - 1) * 86400000)
  const days: { key: string; label: string; tickets: number }[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const d = new Date(t)
    days.push({
      key: toDateInput(d),
      label: d.toLocaleDateString([], { day: 'numeric', month: 'short' }),
      tickets: 0,
    })
  }
  const index = new Map(days.map((d, i) => [d.key, i]))
  for (const o of paid) {
    const key = toDateInput(new Date(o.createdAt as string))
    const i = index.get(key)
    if (i === undefined) continue
    days[i].tickets += o.quantity
  }
  const max = Math.max(1, ...days.map((d) => d.tickets))
  return { days, max }
}

export default function SalesAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const audRates = useAudRates()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [shows, setShows] = useState<SalesShow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [showFilter, setShowFilter] = useState('all')
  const [timeline, setTimeline] = useState<TimelineId>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState('')
  const [busyAction, setBusyAction] = useState<'send' | 'pdf' | null>(null)

  const range = useMemo(
    () => timelineRange(timeline, customFrom, customTo),
    [timeline, customFrom, customTo],
  )

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showFilter !== 'all') params.set('showId', showFilter)
      if (range.from) params.set('from', range.from.toISOString())
      if (range.to) params.set('to', range.to.toISOString())
      const qs = params.toString()
      const res = await fetch(`/api/admin/orders${qs ? `?${qs}` : ''}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load orders')
      setOrders(data.orders || [])
      if (Array.isArray(data.shows)) setShows(data.shows)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilter, range.from?.getTime(), range.to?.getTime()])

  const showOptions = useMemo(() => sortShows(shows), [shows])
  const selectedShow = useMemo(
    () => (showFilter === 'all' ? null : shows.find((s) => s.id === showFilter) || null),
    [shows, showFilter],
  )

  const upcomingShows = useMemo(() => {
    const today = startOfLocalDay().getTime()
    return showOptions.filter((s) => (s.date ? new Date(s.date).getTime() >= today : false))
  }, [showOptions])
  const pastShows = useMemo(() => {
    const today = startOfLocalDay().getTime()
    return showOptions.filter((s) => (s.date ? new Date(s.date).getTime() < today : true))
  }, [showOptions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false
      if (
        q &&
        !o.email.toLowerCase().includes(q) &&
        !o.id.toLowerCase().includes(q) &&
        !(o.holderName || '').toLowerCase().includes(q) &&
        !o.tierName.toLowerCase().includes(q) &&
        !(o.tableNames || []).some((name) => name.toLowerCase().includes(q))
      ) {
        return false
      }
      return true
    })
  }, [orders, search, status])

  const selected = useMemo(
    () => (selectedId ? orders.find((o) => o.id === selectedId) || null : null),
    [orders, selectedId],
  )

  useEffect(() => {
    if (selected) setSendEmail(selected.email === 'pending@checkout' ? '' : selected.email)
  }, [selected])

  const stats = useMemo(() => {
    const paid = filtered.filter((o) => o.status === 'paid')
    const revenue = new Map<string, number>()
    let audTotal: number | null = 0
    for (const o of paid) {
      revenue.set(o.currency, (revenue.get(o.currency) || 0) + o.amountTotal)
      if (audTotal !== null) {
        const asAud = foreignToAudCents(o.amountTotal, o.currency, audRates)
        if (asAud === null) audTotal = null
        else audTotal += asAud
      }
    }
    const native = Array.from(revenue, ([currency, cents]) => formatPrice(cents, currency)).join(' + ')
    const audLabel =
      audTotal !== null && audRates && revenue.size > 0
        ? formatPrice(audTotal, 'AUD')
        : null
    const mixed = Array.from(revenue.keys()).some((c) => c.toUpperCase() !== 'AUD')
    const tickets = paid.reduce((sum, o) => sum + o.quantity, 0)
    const tables = paid.reduce((sum, o) => sum + tableCount(o), 0)
    return {
      paidOrders: paid.length,
      tickets,
      tables,
      checkedIn: paid.reduce((sum, o) => sum + o.checkedInCount, 0),
      revenue: native,
      revenueAud: mixed ? audLabel : null,
    }
  }, [filtered, audRates])

  async function sendTickets() {
    if (!selected || busyAction) return
    setBusyAction('send')
    try {
      const res = await fetch(`/api/admin/tickets/${selected.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send tickets')
      const to = data.email || sendEmail.trim()
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selected.id
            ? {
                ...o,
                email: to,
                confirmationEmailSentAt: new Date().toISOString(),
              }
            : o,
        ),
      )
      onMessage(
        selected.confirmationEmailSentAt
          ? `Tickets resent to ${to}`
          : `Tickets sent to ${to}`,
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to send tickets')
    } finally {
      setBusyAction(null)
    }
  }

  async function downloadTickets() {
    if (!selected || busyAction) return
    setBusyAction('pdf')
    try {
      const res = await fetch(`/api/admin/tickets/${selected.id}/pdf`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate PDFs')
      const files = data.files || []
      if (!files.length) throw new Error('No PDF files returned')
      for (const file of files) {
        downloadBase64Pdf(file.filename, file.contentBase64)
        await new Promise((r) => setTimeout(r, 120))
      }
      onMessage(`Downloaded ${files.length} PDF${files.length === 1 ? '' : 's'}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to download PDFs')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Sales</h2>
          <p className="mt-1 text-sm text-white/40">
            Filter by timeline and show, then open an order to send or resend tickets
          </p>
        </div>
        <button type="button" disabled={loading} className={btnGhost} onClick={() => void load()}>
          <RefreshCw className="mr-1.5 inline h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={labelClass}>Timeline</label>
          <select
            className={inputClass}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value as TimelineId)}
          >
            {TIMELINES.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#141420]">
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Show</label>
          <select
            className={inputClass}
            value={showFilter}
            onChange={(e) => setShowFilter(e.target.value)}
          >
            <option value="all" className="bg-[#141420]">
              All shows
            </option>
            {upcomingShows.length ? (
              <optgroup label="Upcoming" className="bg-[#141420]">
                {upcomingShows.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141420]">
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {pastShows.length ? (
              <optgroup label="Past" className="bg-[#141420]">
                {pastShows.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141420]">
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            {['all', 'paid', 'pending', 'refunded', 'cancelled'].map((s) => (
              <option key={s} value={s} className="bg-[#141420]">
                {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              className={`${inputClass} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, name, order ID, or table"
            />
          </div>
        </div>
      </div>

      {timeline === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>From</label>
            <input
              className={inputClass}
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              className={inputClass}
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {selectedShow ? (
        <ShowTrackingCard
          show={selectedShow}
          periodLabel={range.label}
          periodDays={windowDayCount(range.from, range.to)}
          periodTickets={stats.tickets}
          periodRevenue={stats.revenue}
          periodOrders={filtered}
          rangeFrom={range.from}
          rangeTo={range.to}
          loading={loading}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Paid orders', value: String(stats.paidOrders), sub: range.label, icon: BadgeCheck, tone: 'bg-emerald-500/10 text-emerald-400' },
          {
            label: 'Tickets sold',
            value: String(stats.tickets),
            sub: stats.tables
              ? `${stats.tables} table${stats.tables === 1 ? '' : 's'}`
              : range.label,
            icon: Ticket,
            tone: 'bg-violet-500/10 text-violet-400',
          },
          { label: 'Checked in', value: String(stats.checkedIn), sub: '', icon: ScanLine, tone: 'bg-sky-500/10 text-sky-400' },
          { label: 'Revenue', value: stats.revenue || '—', sub: stats.revenueAud ? `${stats.revenueAud} base` : range.label, icon: Banknote, tone: 'bg-amber-500/10 text-amber-400' },
        ].map((card) => (
          <div key={card.label} className="admin-card p-5">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="truncate text-xl font-bold tabular-nums text-white" title={card.value}>
              {loading ? '—' : card.value}
            </p>
            {card.sub ? (
              <p className="mt-0.5 truncate text-xs text-white/50" title={card.sub}>
                {loading ? '' : card.sub}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-white/40">{card.label}</p>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="admin-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">
                {selected.holderName || selected.email}
              </p>
              <p className="mt-1 font-mono text-xs text-white/35">{selected.id}</p>
            </div>
            <button
              type="button"
              className={btnGhost}
              onClick={() => setSelectedId(null)}
              aria-label="Close order"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-white/40">Show</p>
              <p className="mt-0.5 text-white/80">
                {selected.show
                  ? `${selected.show.city} · ${selected.show.venue}`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40">Tickets</p>
              <p className="mt-0.5 text-white/80">{purchaseQtyLabel(selected)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Status</p>
              <p className="mt-0.5 capitalize text-white/80">{selected.status}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Last emailed</p>
              <p className="mt-0.5 text-white/80">
                {selected.confirmationEmailSentAt
                  ? orderDateLabel(selected.confirmationEmailSentAt)
                  : 'Not sent'}
              </p>
            </div>
          </div>
          {selected.status === 'paid' ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <div>
                <label className={labelClass}>Send tickets to</label>
                <input
                  className={inputClass}
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="buyer@email.com"
                />
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={busyAction !== null || !sendEmail.trim()}
                onClick={() => void sendTickets()}
              >
                <Mail className="mr-1.5 inline h-4 w-4" />
                {busyAction === 'send'
                  ? 'Sending…'
                  : selected.confirmationEmailSentAt
                    ? 'Resend tickets'
                    : 'Send tickets'}
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={busyAction !== null}
                onClick={() => void downloadTickets()}
              >
                <Download className="mr-1.5 inline h-4 w-4" />
                {busyAction === 'pdf' ? 'Preparing…' : 'Download PDFs'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/40">
              Tickets can be emailed once this order is paid.
            </p>
          )}
        </div>
      ) : null}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Buyer</th>
              <th className="hidden md:table-cell">Show</th>
              <th>Tickets</th>
              <th className="hidden sm:table-cell">Total</th>
              <th className="hidden sm:table-cell">Status</th>
              <th>Stripe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-5 py-4">
                    <div className="h-4 animate-pulse rounded bg-white/5" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-white/40">
                  {orders.length === 0 ? 'No orders in this view.' : 'No orders match the filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr
                  key={order.id}
                  className={`cursor-pointer transition-colors hover:bg-white/[0.04] ${
                    selectedId === order.id ? 'bg-white/[0.06]' : ''
                  }`}
                  onClick={() => setSelectedId(order.id)}
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-white/70">
                    {orderDateLabel(order.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white">
                      {order.holderName || order.email}
                    </p>
                    {order.holderName ? (
                      <p className="mt-0.5 text-xs text-white/50">{order.email}</p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-white/35">{order.id}</p>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    {order.show ? (
                      <>
                        <p className="text-sm text-white/80">
                          {order.show.city} · {order.show.venue}
                        </p>
                        <p className="mt-0.5 text-xs text-white/40">{order.show.tour}</p>
                      </>
                    ) : (
                      <span className="text-xs text-white/25">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-sm text-white/80">{purchaseQtyLabel(order)}</p>
                    {tableCount(order) > 0 ? (
                      <p className="mt-0.5 text-xs text-white/40">
                        {order.quantity} ticket{order.quantity === 1 ? '' : 's'}
                        {order.tableNames?.length
                          ? ` · ${order.tableNames.join(', ')}`
                          : ''}
                      </p>
                    ) : order.tableNames?.length ? (
                      <p className="mt-0.5 text-xs text-white/40">
                        {order.tableNames.join(', ')}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-white/40">
                      {order.checkedInCount
                        ? `${order.checkedInCount} of ${order.quantity} checked in`
                        : 'Not checked in'}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-5 py-4 text-sm text-white/70 sm:table-cell">
                    {formatPriceWithAud(order.amountTotal, order.currency, audRates)}
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[order.status] || STATUS_STYLES.cancelled}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {order.stripeUrl ? (
                      <a
                        href={order.stripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200"
                      >
                        Payment
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-white/25">—</span>
                    )}
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

function ShowTrackingCard({
  show,
  periodLabel,
  periodDays,
  periodTickets,
  periodRevenue,
  periodOrders,
  rangeFrom,
  rangeTo,
  loading,
}: {
  show: SalesShow
  periodLabel: string
  periodDays: number
  periodTickets: number
  periodRevenue: string
  periodOrders: AdminOrder[]
  rangeFrom: Date | null
  rangeTo: Date | null
  loading: boolean
}) {
  const inv = inventoryOf(show)
  const days = daysUntilShow(show.date)
  const when = showWhenLabel(show.date)
  const date = show.date ? formatShowDate(show.date) : null
  const status = SHOW_STATUS_STYLES[show.status] || SHOW_STATUS_STYLES.on_sale
  const pace = periodTickets / Math.max(1, periodDays)
  const needed =
    inv.remaining !== null && days !== null && days > 0
      ? inv.remaining / days
      : null
  const onTrack = needed !== null ? pace + 0.05 >= needed : null
  const bars = dailyTicketBars(periodOrders, rangeFrom, rangeTo)

  let paceCopy = `${pace.toFixed(1)} tickets/day in this period`
  if (show.status === 'sold_out' || (inv.remaining === 0 && inv.cap > 0)) {
    paceCopy = 'Sold out'
  } else if (days !== null && days < 0) {
    paceCopy = 'Show has passed'
  } else if (needed !== null && onTrack) {
    paceCopy = `On track — selling ${pace.toFixed(1)}/day vs ~${needed.toFixed(1)}/day needed`
  } else if (needed !== null) {
    paceCopy = `Behind — ${pace.toFixed(1)}/day this period, need ~${needed.toFixed(1)}/day`
  }

  return (
    <div className="admin-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">
            {show.city} · {show.venue}
          </p>
          <p className="mt-1 text-sm text-white/45">
            {date?.full || 'Date TBC'}
            {when ? ` · ${when}` : ''}
            {show.tour ? ` · ${show.tour}` : ''}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-white/70">
              {loading ? '—' : `${inv.sold} sold`}
              {inv.cap > 0 ? ` of ${inv.cap}` : ''}
            </p>
            {inv.pct !== null ? (
              <p className="text-sm tabular-nums text-white/50">{inv.pct}%</p>
            ) : (
              <p className="text-xs text-white/35">Unlimited allocation</p>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-400"
              style={{ width: `${inv.pct ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/40">{loading ? '' : paceCopy}</p>
          <p className="mt-3 text-xs text-white/35">
            {periodLabel}: {periodTickets} ticket{periodTickets === 1 ? '' : 's'}
            {periodRevenue ? ` · ${periodRevenue}` : ''}
          </p>

          {bars.days.length > 1 ? (
            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/30">
                Daily tickets
              </p>
              <div className="flex h-16 items-end gap-px">
                {bars.days.map((d) => (
                  <div
                    key={d.key}
                    className="min-w-0 flex-1 rounded-sm bg-violet-400/80"
                    style={{ height: `${Math.max(d.tickets ? 8 : 2, (d.tickets / bars.max) * 100)}%` }}
                    title={`${d.label}: ${d.tickets}`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-white/25">
                <span>{bars.days[0]?.label}</span>
                <span>{bars.days[bars.days.length - 1]?.label}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Classes</p>
          {inv.classes.length || inv.tables.length ? (
            <ul className="space-y-2">
              {inv.classes.map((tier) => (
                <li key={tier.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-white/75">{tier.name}</span>
                  <span className="shrink-0 tabular-nums text-white/45">
                    {tier.ticketsSold}
                    {tier.capacity > 0 ? ` / ${tier.capacity}` : ''}
                    {tier.soldOut ? ' · sold out' : ''}
                  </span>
                </li>
              ))}
              {inv.tables.map((tier) => (
                <li key={tier.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-white/75">
                    {tier.name}
                    <span className="text-white/35"> · tables</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-white/45">
                    {tier.ticketsSold}
                    {tier.capacity > 0 ? ` / ${tier.capacity}` : ''}
                    {tier.soldOut ? ' · sold out' : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">No ticket classes on this date.</p>
          )}
        </div>
      </div>
    </div>
  )
}
