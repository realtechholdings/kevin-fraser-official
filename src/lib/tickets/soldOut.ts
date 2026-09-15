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
 * Remaining buyable units (tickets, or tables when kind is table).
 * `null` = unlimited. Venue remaining of `null` means no venue cap.
 */
export function remainingOfferingUnits(
  tier: Pick<PublicTicketTier, 'kind' | 'seats' | 'capacity' | 'ticketsSold' | 'soldOut'>,
  venueRemaining: number | null = null,
): number | null {
  if (tier.soldOut) return 0
  const seats = offeringSeats(tier)
  const byOffering =
    (tier.capacity || 0) > 0
      ? Math.max(0, (tier.capacity || 0) - (tier.ticketsSold || 0))
      : null
  if (venueRemaining === null) return byOffering
  const byVenue = Math.floor(venueRemaining / seats)
  if (byOffering === null) return byVenue
  return Math.min(byOffering, byVenue)
}

export function venueCanTake(show: VenueShow, ticketQty: number): boolean {
  const remaining = venueSeatRemaining(show)
  if (remaining === null) return true
  return ticketQty <= remaining
}

/**
 * Exhausted by capacity, venue seats, or manually marked sold out by admin.
 * Unlimited tiers (capacity 0) are only sold out when the flag is set,
 * unless a venue cap leaves fewer seats than this offering needs.
 */
export function isTierSoldOut(
  tier: Pick<PublicTicketTier, 'capacity' | 'ticketsSold' | 'soldOut' | 'kind' | 'seats'>,
  venueRemaining: number | null = null,
): boolean {
  if (tier.soldOut) return true
  const remaining = remainingOfferingUnits(tier, venueRemaining)
  if (remaining === null) return false
  return remaining <= 0
}

/**
 * True when every sellable tier for a show is exhausted.
 * Legacy / no-tier shows are never auto-sold-out by class.
 * Pass venue remaining so leftover tables cannot outrun the room.
 */
export function areAllTiersSoldOut(
  tiers: TierLike[],
  venueRemaining: number | null = null,
): boolean {
  const sellable = tiers.filter((t) => t.published !== false && !t.legacy)
  if (!sellable.length) return false
  return sellable.every((tier) => isTierSoldOut(tier, venueRemaining))
}

/** Status flag, venue full, or all limited tiers exhausted. */
export function isShowEffectivelySoldOut(show: {
  status: string
  capacity?: number
  ticketsSold?: number
  tiers?: TierLike[]
}): boolean {
  if (show.status === 'sold_out') return true
  const venue = venueSeatRemaining(show)
  if (venue === 0) return true
  if (show.tiers?.length) return areAllTiersSoldOut(show.tiers, venue)
  return false
}
