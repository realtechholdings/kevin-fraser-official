'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  ExternalLink,
  ScanLine,
  Search,
  Ticket,
  RefreshCw,
} from 'lucide-react'
import { formatPrice, formatShowDate } from '@/lib/format'
import { formatPriceWithAud, foreignToAudCents } from '@/lib/fx'
import { useAudRates } from '@/components/admin/useAudRates'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type AdminOrder = {
  id: string
  createdAt: string | null
  email: string
  quantity: number
  tierName: string
  tableNames?: string[]
  amountTotal: number
  currency: string
  status: string
  checkedInCount: number
  stripePaymentIntentId: string
  stripeUrl: string
  show: { id: string; city: string; venue: string; date: string | null; tour: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'text-emerald-400 bg-emerald-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
  refunded: 'text-sky-400 bg-sky-400/10',
  cancelled: 'text-white/30 bg-white/5',
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

export default function SalesAdminPanel({
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const audRates = useAudRates()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [showFilter, setShowFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load orders')
      setOrders(data.orders || [])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of orders) {
      if (o.show) {
        const d = o.show.date ? formatShowDate(o.show.date) : null
        map.set(o.show.id, `${o.show.city} · ${o.show.venue}${d ? ` (${d.day} ${d.month})` : ''}`)
      }
    }
    return Array.from(map, ([id, label]) => ({ id, label }))
  }, [orders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false
      if (showFilter !== 'all' && o.show?.id !== showFilter) return false
      if (q && !o.email.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false
      return true
    })
  }, [orders, search, status, showFilter])

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
    return {
      paidOrders: paid.length,
      tickets: paid.reduce((sum, o) => sum + o.quantity, 0),
      checkedIn: paid.reduce((sum, o) => sum + o.checkedInCount, 0),
      revenue: native,
      revenueAud: mixed ? audLabel : null,
    }
  }, [filtered, audRates])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Sales</h2>
          <p className="mt-1 text-sm text-white/40">
            Ticket purchases with check-in status and Stripe payment links
          </p>
        </div>
        <button type="button" disabled={loading} className={btnGhost} onClick={() => void load()}>
          <RefreshCw className="mr-1.5 inline h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Paid orders', value: String(stats.paidOrders), sub: '', icon: BadgeCheck, tone: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Tickets sold', value: String(stats.tickets), sub: '', icon: Ticket, tone: 'bg-violet-500/10 text-violet-400' },
          { label: 'Checked in', value: String(stats.checkedIn), sub: '', icon: ScanLine, tone: 'bg-sky-500/10 text-sky-400' },
          { label: 'Revenue', value: stats.revenue || '—', sub: stats.revenueAud ? `${stats.revenueAud} base` : '', icon: Banknote, tone: 'bg-amber-500/10 text-amber-400' },
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

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className={labelClass}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              className={`${inputClass} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email or order ID"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Show</label>
          <select className={inputClass} value={showFilter} onChange={(e) => setShowFilter(e.target.value)}>
            <option value="all" className="bg-[#141420]">All shows</option>
            {showOptions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#141420]">
                {s.label}
              </option>
            ))}
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
      </div>

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
                  {orders.length === 0 ? 'No orders yet.' : 'No orders match the filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-white/70">
                    {orderDateLabel(order.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white">{order.email}</p>
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
                    <p className="text-sm text-white/80">
                      {order.quantity} × {order.tierName}
                    </p>
                    {order.tableNames?.length ? (
                      <p className="mt-0.5 text-xs text-white/40">{order.tableNames.join(', ')}</p>
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
