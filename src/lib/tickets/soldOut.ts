import type { PublicTicketTier } from '@/lib/serialize'

type TierLike = Pick<
  PublicTicketTier,
  'published' | 'capacity' | 'ticketsSold' | 'soldOut' | 'legacy' | 'kind' | 'seats'
>

type VenueShow = {
  capacity?: number
  ticketsSold?: number
}

/**
 * Seats still sellable against venue capacity. `null` = no venue cap (0 = unlimited).
 */
export function venueSeatRemaining(show: VenueShow): number | null {
  const cap = Number(show.capacity) || 0
  if (cap <= 0) return null
  return Math.max(0, cap - (Number(show.ticketsSold) || 0))
}

export function offeringSeats(
  tier: Pick<PublicTicketTier, 'kind' | 'seats'> | null | undefined,
): number {
  if (tier?.kind === 'table') return Math.max(1, Number(tier.seats) || 1)
  return 1
}

/**
 * Seats held by unsold table packages. Ticket classes cannot sell these —
 * leftover venue crumbs (e.g. 6 seats left, 10-top tables remaining) must
 * not wipe table inventory or auto-sell-out the show.
 */
export function unsoldTableSeats(tiers: TierLike[] | undefined): number {
  if (!tiers?.length) return 0
  let seats = 0
  for (const tier of tiers) {
    if (tier.kind !== 'table' || tier.published === false || tier.soldOut) continue
    const cap = Number(tier.capacity) || 0
    if (cap <= 0) continue
    const remaining = Math.max(0, cap - (Number(tier.ticketsSold) || 0))
    seats += remaining * offeringSeats(tier)
  }
  return seats
}

/**
 * Remaining buyable units (tickets, or tables when kind is table).
 * `null` = unlimited. Venue remaining of `null` means no venue cap.
 */
export function remainingOfferingUnits(
  tier: Pick<PublicTicketTier, 'kind' | 'seats' | 'capacity' | 'ticketsSold' | 'soldOut'>,
  venueRemaining: number | null = null,
  allTiers: TierLike[] | undefined = undefined,
): number | null {
  if (tier.soldOut) return 0
  const byOffering =
    (tier.capacity || 0) > 0
      ? Math.max(0, (tier.capacity || 0) - (tier.ticketsSold || 0))
      : null

  // Table packages keep their own stock. A leftover 6 venue seats cannot
  // mark a 10-seat Cassette table sold out while 3 of 6 tables remain.
  if (tier.kind === 'table') return byOffering

  if (venueRemaining === null) return byOffering
  const byVenue = Math.max(0, venueRemaining - unsoldTableSeats(allTiers))
  if (byOffering === null) return byVenue
  return Math.min(byOffering, byVenue)
}

export function venueCanTake(
  show: VenueShow,
  ticketQty: number,
  reservedTableSeats = 0,
): boolean {
  const remaining = venueSeatRemaining(show)
  if (remaining === null) return true
  return ticketQty <= Math.max(0, remaining - reservedTableSeats)
}

/**
 * Exhausted by capacity, venue seats, or manually marked sold out by admin.
 * Unlimited tiers (capacity 0) are only sold out when the flag is set,
 * unless a venue cap leaves fewer seats than this offering needs.
 */
export function isTierSoldOut(
  tier: Pick<PublicTicketTier, 'capacity' | 'ticketsSold' | 'soldOut' | 'kind' | 'seats'>,
  venueRemaining: number | null = null,
  allTiers: TierLike[] | undefined = undefined,
  showStatus?: string,
): boolean {
  if (tier.soldOut) return true
  // A sticky sold_out flag means leftover ticket classes are not for sale
  // (Joburg Floppy/Polaroid crumbs). Table packages can still sell reserved stock.
  if (showStatus === 'sold_out' && tier.kind !== 'table') return true
  const remaining = remainingOfferingUnits(tier, venueRemaining, allTiers)
  if (remaining === null) return false
  return remaining <= 0
}

/**
 * True when every sellable tier for a show is exhausted.
 * Legacy / no-tier shows are never auto-sold-out by class.
 * Pass venue remaining so leftover tables cannot outrun the room —
 * except table packages, which keep their reserved inventory.
 */
export function areAllTiersSoldOut(
  tiers: TierLike[],
  venueRemaining: number | null = null,
): boolean {
  const sellable = tiers.filter((t) => t.published !== false && !t.legacy)
  if (!sellable.length) return false
  return sellable.every((tier) => isTierSoldOut(tier, venueRemaining, sellable))
}

export function hasRemainingTableInventory(
  tiers: TierLike[] | undefined,
  venueRemaining: number | null = null,
): boolean {
  if (!tiers?.length) return false
  return tiers.some(
    (tier) =>
      tier.kind === 'table' &&
      tier.published !== false &&
      !tier.legacy &&
      !isTierSoldOut(tier, venueRemaining, tiers),
  )
}

/** Status flag, venue full, or all limited tiers exhausted. */
export function isShowEffectivelySoldOut(show: {
  status: string
  capacity?: number
  ticketsSold?: number
  tiers?: TierLike[]
}): boolean {
  const venue = venueSeatRemaining(show)
  // A sticky sold_out flag from leftover venue crumbs should not hide
  // remaining table packages. Other leftover classes still respect the flag.
  if (show.status === 'sold_out') {
    return !hasRemainingTableInventory(show.tiers, venue)
  }
  if (show.tiers?.length) return areAllTiersSoldOut(show.tiers, venue)
  return venue === 0
}
