/** Max individual tickets a buyer can add in one checkout. */
export const MAX_TICKET_QUANTITY = 20

/**
 * Max seats in one table checkout. Dividing the individual-ticket cap by
 * seats made a 10-seat table look like only 2 were for sale.
 */
export const MAX_TABLE_SEATS = 60

/** How many tables one checkout can take, given stock and the seat cap. */
export function maxTablesPerOrder(seats: number, remaining: number | null): number {
  const perTable = Math.max(1, seats || 1)
  const bySeats = Math.max(1, Math.floor(MAX_TABLE_SEATS / perTable))
  const byStock = remaining === null ? MAX_TICKET_QUANTITY : Math.max(0, remaining)
  return Math.max(1, Math.min(byStock || 1, bySeats, MAX_TICKET_QUANTITY))
}
