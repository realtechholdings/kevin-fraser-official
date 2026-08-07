import type { PublicTicketTier } from '@/lib/serialize'

type TierLike = Pick<
  PublicTicketTier,
  'published' | 'capacity' | 'ticketsSold' | 'soldOut' | 'legacy'
>

/**
 * Exhausted by capacity, or manually marked sold out by admin.
 * Unlimited tiers (capacity 0) are only sold out when the flag is set.
 */
export function isTierSoldOut(
  tier: Pick<PublicTicketTier, 'capacity' | 'ticketsSold' | 'soldOut'>,
): boolean {
  if (tier.soldOut) return true
  return tier.capacity > 0 && tier.ticketsSold >= tier.capacity
}

/**
 * True when every sellable tier for a show is exhausted.
 * Legacy / no-tier shows are never auto-sold-out.
 * Venue capacity is intentionally ignored.
 */
export function areAllTiersSoldOut(tiers: TierLike[]): boolean {
  const sellable = tiers.filter((t) => t.published !== false && !t.legacy)
  if (!sellable.length) return false
  return sellable.every(isTierSoldOut)
}

/** Status flag or all limited tiers exhausted. */
export function isShowEffectivelySoldOut(show: {
  status: string
  tiers?: TierLike[]
}): boolean {
  if (show.status === 'sold_out') return true
  if (show.tiers?.length) return areAllTiersSoldOut(show.tiers)
  return false
}
