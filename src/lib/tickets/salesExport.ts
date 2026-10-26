import { liveTicketNumbers } from '@/lib/tickets/ticketNumbers'

export type SalesExportKind = 'sales' | 'comps' | 'refunds'

export type ExportOrder = {
  id: string
  createdAt: Date | string | null
  email: string
  holderName: string
  quantity: number
  liveQuantity: number
  tierName: string
  tableQuantity: number
  tableNames: string[]
  amountTotal: number
  currency: string
  status: string
  source: string
  note: string
  refundedAt: Date | string | null
  refundedCents: number
  upgradedFrom: boolean
  transferFrom: boolean
  show: {
    city: string
    venue: string
    dateLabel: string
    archived: boolean
  } | null
}

type ExportSource = {
  _id: unknown
  createdAt?: Date
  email?: string
  holderName?: string
  quantity?: number
  tierName?: string
  tableQuantity?: number
  tableNames?: string[]
  amountTotal?: number
  currency?: string
  status?: string
  source?: string
  note?: string
  refundedAt?: Date | null
  refundedCents?: number
  upgradedFrom?: unknown
  transferFrom?: unknown
  voidedTickets?: { ticket?: number }[]
  show?: {
    city?: string
    venue?: string
    date?: Date | string
    archivedAt?: Date | null
  } | null
}

export function isCompOrder(order: {
  source?: string
  amountTotal?: number
  upgradedFrom?: unknown
  transferFrom?: unknown
}) {
  return (
    (order.source || 'stripe') === 'manual' &&
    !(Number(order.amountTotal) > 0) &&
    !order.upgradedFrom &&
    !order.transferFrom
  )
}

/**
 * Money already sent back. Full refunds recorded before the amount was stored
 * still carry the original charge.
 */
export function refundedCentsOf(order: {
  status?: string
  amountTotal?: number
  refundedCents?: number
}) {
  const stored = Math.max(0, Math.round(Number(order.refundedCents) || 0))
  if (stored > 0) return stored
  if (order.status === 'refunded' && Number(order.amountTotal) > 0) {
    return Math.round(Number(order.amountTotal))
  }
  return 0
}

export function netCentsOf(order: { amountTotal?: number; status?: string; refundedCents?: number }) {
  return Math.max(0, Math.round(Number(order.amountTotal) || 0) - refundedCentsOf(order))
}

function csvCell(value: string | number) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function csv(rows: (string | number)[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}

function when(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
}

function showCells(order: ExportOrder) {
  const show = order.show
  return [
    show?.city || '',
    show?.venue || '',
    show?.dateLabel || '',
    show?.archived ? 'removed' : '',
  ]
}

export function salesCsv(orders: ExportOrder[]) {
  const header = [
    'Order ID',
    'Purchased',
    'City',
    'Venue',
    'Show date',
    'Show status',
    'Order status',
    'Customer',
    'Email',
    'Category',
    'Tickets',
    'Tables',
    'Table names',
    'Currency',
    'Charged',
    'Refunded',
    'Net',
    'Kind',
  ]
  const lines: (string | number)[][] = [header]
  for (const order of orders) {
    if (isCompOrder(order)) continue
    if (!['paid', 'upgraded', 'transferred'].includes(order.status)) continue
    const moved = order.status === 'upgraded' || order.status === 'transferred'
    const tickets = moved ? 0 : order.liveQuantity
    const charged = order.amountTotal / 100
    const refunded = refundedCentsOf(order) / 100
    lines.push([
      order.id,
      when(order.createdAt),
      ...showCells(order),
      order.status,
      order.holderName,
      order.email,
      order.tierName,
      tickets,
      order.tableQuantity || 0,
      order.tableNames.join('; '),
      order.currency,
      charged.toFixed(2),
      refunded.toFixed(2),
      (charged - refunded).toFixed(2),
      moved ? order.status : order.transferFrom ? 'transfer difference' : 'sale',
    ])
  }
  return csv(lines)
}

export function compsCsv(orders: ExportOrder[]) {
  const header = [
    'Order ID',
    'Issued',
    'City',
    'Venue',
    'Show date',
    'Show status',
    'Customer',
    'Email',
    'Category',
    'Tickets',
    'Tables',
    'Note',
  ]
  const lines: (string | number)[][] = [header]
  for (const order of orders) {
    if (!isCompOrder(order) || order.status === 'cancelled') continue
    lines.push([
      order.id,
      when(order.createdAt),
      ...showCells(order),
      order.holderName,
      order.email,
      order.tierName,
      order.liveQuantity || order.quantity,
      order.tableQuantity || 0,
      order.note,
    ])
  }
  return csv(lines)
}

export function refundsCsv(orders: ExportOrder[]) {
  const header = [
    'Order ID',
    'Refunded',
    'City',
    'Venue',
    'Show date',
    'Show status',
    'Order status',
    'Customer',
    'Email',
    'Category',
    'Tickets',
    'Currency',
    'Amount refunded',
    'Record',
  ]
  const lines: (string | number)[][] = [header]
  for (const order of orders) {
    const amount = refundedCentsOf(order)
    const refunded = order.status === 'refunded' || amount > 0
    if (!refunded) continue
    const comp = isCompOrder(order)
    lines.push([
      order.id,
      when(order.refundedAt || order.createdAt),
      ...showCells(order),
      order.status,
      order.holderName,
      order.email,
      order.tierName,
      order.status === 'refunded' ? order.quantity : Math.max(0, order.quantity - order.liveQuantity),
      order.currency,
      (amount / 100).toFixed(2),
      comp || amount === 0 ? 'complimentary void' : 'refund',
    ])
  }
  return csv(lines)
}

export function renderSalesExport(kind: SalesExportKind, orders: ExportOrder[]) {
  if (kind === 'comps') return { filename: 'complimentary-tickets.csv', body: compsCsv(orders) }
  if (kind === 'refunds') return { filename: 'refunds.csv', body: refundsCsv(orders) }
  return { filename: 'sales.csv', body: salesCsv(orders) }
}

export function toExportOrder(
  order: ExportSource,
  dateLabel: string,
): ExportOrder {
  const show = order.show
  return {
    id: String(order._id),
    createdAt: order.createdAt || null,
    email: order.email || '',
    holderName: order.holderName || '',
    quantity: order.quantity || 0,
    liveQuantity: liveTicketNumbers({
      quantity: order.quantity || 0,
      voidedTickets: order.voidedTickets,
    }).length,
    tierName: order.tierName || 'General Admission',
    tableQuantity: order.tableQuantity || 0,
    tableNames: order.tableNames || [],
    amountTotal: order.amountTotal || 0,
    currency: order.currency || '',
    status: order.status || '',
    source: order.source || 'stripe',
    note: order.note || '',
    refundedAt: order.refundedAt || null,
    refundedCents: order.refundedCents || 0,
    upgradedFrom: Boolean(order.upgradedFrom),
    transferFrom: Boolean(order.transferFrom),
    show: show
      ? {
          city: show.city || '',
          venue: show.venue || '',
          dateLabel,
          archived: Boolean(show.archivedAt),
        }
      : null,
  }
}
