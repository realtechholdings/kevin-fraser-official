export type VoidedTicket = {
  ticket: number
  reason: 'refunded' | 'upgraded'
}

type NumberedOrder = {
  quantity: number
  voidedTickets?: { ticket?: number | null }[] | null
  checkedIn?: { ticket?: number | null }[] | null
}

function ticketSet(rows: { ticket?: number | null }[] | null | undefined) {
  const set = new Set<number>()
  for (const row of rows || []) {
    const ticket = Number(row?.ticket)
    if (Number.isInteger(ticket) && ticket > 0) set.add(ticket)
  }
  return set
}

/** Ticket numbers on this order that still scan (1-based, original PDFs). */
export function liveTicketNumbers(order: NumberedOrder) {
  const voided = ticketSet(order.voidedTickets)
  const live: number[] = []
  const quantity = Math.max(0, Math.floor(Number(order.quantity) || 0))
  for (let ticket = 1; ticket <= quantity; ticket++) {
    if (!voided.has(ticket)) live.push(ticket)
  }
  return live
}

/** Live tickets that have not been scanned in. */
export function refundableTicketNumbers(order: NumberedOrder) {
  const checkedIn = ticketSet(order.checkedIn)
  return liveTicketNumbers(order).filter((ticket) => !checkedIn.has(ticket))
}

/**
 * Prefer the highest ticket numbers so ticket 1 stays valid when only some
 * of an order are refunded or upgraded.
 */
export function pickTicketNumbers(available: number[], count: number) {
  const n = Math.max(0, Math.floor(count))
  return [...available].sort((a, b) => b - a).slice(0, n).sort((a, b) => a - b)
}

/**
 * Share of `amountTotal` that belongs to specific ticket numbers.
 * Ticket 1 carries any remainder so repeated partial refunds sum to the total.
 */
export function centsForTickets(amountTotal: number, quantity: number, tickets: number[]) {
  const total = Math.max(0, Math.round(Number(amountTotal) || 0))
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  if (!total || !qty || !tickets.length) return 0
  const base = Math.floor(total / qty)
  const remainder = total - base * qty
  return tickets.reduce((sum, ticket) => sum + base + (ticket === 1 ? remainder : 0), 0)
}
