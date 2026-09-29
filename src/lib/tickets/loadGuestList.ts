import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate, formatShowTimeRange, slugify } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import {
  buildGuestListRows,
  type GuestListRow,
  type GuestListShowInfo,
} from '@/lib/tickets/guestListPdf'

const PURCHASE_ZONE = 'Australia/Sydney'

export type GuestListQuery = {
  purchasedFrom: string
  purchasedTo: string
  source: 'all' | 'paid' | 'comp'
  q: string
}

export function parseGuestListQuery(params: URLSearchParams): GuestListQuery {
  const source = params.get('source') || 'all'
  return {
    purchasedFrom: ymd(params.get('from')),
    purchasedTo: ymd(params.get('to')),
    source: source === 'paid' || source === 'comp' ? source : 'all',
    q: (params.get('q') || '').trim(),
  }
}

export function guestListFilterNote(query: GuestListQuery) {
  const parts: string[] = []
  if (query.purchasedFrom) parts.push(`from-${query.purchasedFrom}`)
  if (query.purchasedTo) parts.push(`through-${query.purchasedTo}`)
  if (query.source !== 'all') parts.push(query.source)
  if (query.q) parts.push('search')
  return parts.join('-')
}

function ymd(value: string | null) {
  const raw = (value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

/** UTC instant of local midnight on a calendar day in Australia/Sydney. */
export function sydneyDayStart(ymdValue: string): Date | null {
  if (!ymd(ymdValue)) return null
  const [year, month, day] = ymdValue.split('-').map(Number)
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PURCHASE_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(utcMidnight)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(utcMidnight.getTime() - (asUtc - utcMidnight.getTime()))
}

function nextYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function filterGuestListRows(rows: GuestListRow[], query: GuestListQuery) {
  const from = query.purchasedFrom ? sydneyDayStart(query.purchasedFrom) : null
  const to = query.purchasedTo ? sydneyDayStart(nextYmd(query.purchasedTo)) : null
  const q = query.q.trim().toLowerCase()

  return rows.filter((row) => {
    if (query.source !== 'all' && row.source !== query.source) return false
    if (q) {
      const haystack = `${row.name} ${row.email} ${row.tierName}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (from || to) {
      if (!row.purchasedAt) return false
      const at = new Date(row.purchasedAt).getTime()
      if (Number.isNaN(at)) return false
      if (from && at < from.getTime()) return false
      if (to && at >= to.getTime()) return false
    }
    return true
  })
}

type ChainOrder = {
  _id: mongoose.Types.ObjectId
  createdAt?: Date
  upgradedFrom?: mongoose.Types.ObjectId | null
  status?: string
  email?: string
  holderName?: string
  quantity?: number
  tierName?: string
  tableNames?: string[]
  tableQuantity?: number
  source?: string
  note?: string
  checkedIn?: { ticket?: number }[]
}

function originalPurchasedAt(order: ChainOrder, byId: Map<string, ChainOrder>) {
  let earliest = order.createdAt || null
  let cursor: ChainOrder | undefined = order
  const seen = new Set<string>()
  while (cursor?.upgradedFrom) {
    const id = String(cursor.upgradedFrom)
    if (seen.has(id)) break
    seen.add(id)
    const prev = byId.get(id)
    if (!prev) break
    if (prev.createdAt && (!earliest || prev.createdAt < earliest)) earliest = prev.createdAt
    cursor = prev
  }
  return earliest
}

export async function loadGuestList(showId: string, query: GuestListQuery = parseGuestListQuery(new URLSearchParams())) {
  await dbConnect()
  const show = await Show.findById(showId).populate('tour')
  if (!show) return null

  const orders = (await Order.find({
    show: showId,
    status: { $in: ['paid', 'upgraded'] },
  }).sort({ createdAt: 1 })) as unknown as ChainOrder[]

  const byId = new Map(orders.map((order) => [String(order._id), order]))
  const paid = orders.filter((order) => order.status === 'paid')
  const date = toWallIso(show.date)
  const formatted = date ? formatShowDate(date) : null
  const tour =
    show.tour && typeof show.tour === 'object' && 'title' in show.tour
      ? String((show.tour as { title?: string }).title || '')
      : ''

  const info: GuestListShowInfo = {
    city: show.city,
    venue: show.venue,
    tour,
    dateLabel: formatted?.full || '',
    timeLabel: formatShowTimeRange(show.showTime, show.showEndTime) || show.showTime || '',
  }

  const rows = buildGuestListRows(
    paid.map((order) => ({
      id: String(order._id),
      email: order.email,
      holderName: order.holderName,
      quantity: order.quantity,
      tierName: order.tierName,
      tableNames: order.tableNames,
      tableQuantity: order.tableQuantity,
      source: order.source,
      note: order.note,
      checkedIn: order.checkedIn,
      status: order.status,
      purchasedAt: originalPurchasedAt(order, byId),
    })),
  )
  const filtered = filterGuestListRows(rows, query)

  return {
    show: {
      id: String(show._id),
      ...info,
    },
    rows: filtered,
    totalGuests: rows.length,
    totalTickets: rows.reduce((sum, row) => sum + row.quantity, 0),
  }
}

export function guestListCsv(show: GuestListShowInfo, rows: GuestListRow[]) {
  const headers = [
    'Name',
    'Email',
    'Quantity',
    'Class',
    'Table',
    'Purchased',
    'Source',
    'Checked in',
    'Order ID',
    'Note',
  ]
  const lines = [headers.join(',')]
  for (const row of rows) {
    const purchased = row.purchasedAt
      ? new Date(row.purchasedAt).toLocaleString('en-AU', { timeZone: PURCHASE_ZONE })
      : ''
    lines.push(
      [
        row.name,
        row.email,
        String(row.quantity),
        row.tierName,
        row.tableLabel,
        purchased,
        row.source === 'comp' ? 'Complimentary' : 'Paid',
        String(row.checkedIn),
        row.orderId,
        row.note,
      ]
        .map(csvCell)
        .join(','),
    )
  }
  const city = slugify(show.city) || 'guest-list'
  const date = slugify(show.dateLabel) || 'show'
  return {
    body: `\uFEFF${lines.join('\n')}\n`,
    filename: `guest-list-${city}-${date}.csv`,
  }
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function isShowId(value: string) {
  return mongoose.isValidObjectId(value)
}
