import Show from '@/lib/models/Show'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { areAllTiersSoldOut, venueSeatRemaining } from '@/lib/tickets/soldOut'

function exhausted(show: { capacity?: number; ticketsSold?: number }, tiers: Parameters<typeof areAllTiersSoldOut>[0]) {
  const venue = venueSeatRemaining(show)
  return venue === 0 || areAllTiersSoldOut(tiers, venue)
}

/**
 * Flip an on-sale show to sold_out when all sellable tiers are gone,
 * or when venue capacity has no seats left.
 * Does not overwrite cancelled / coming_soon / already sold_out.
 */
export async function maybeMarkShowSoldOut(showId: string): Promise<boolean> {
  const show = await Show.findById(showId)
  if (!show || show.status !== 'on_sale') return false

  const tiers = await resolveTiersForShow(show)
  if (!exhausted(show, tiers)) return false

  show.status = 'sold_out'
  await show.save()
  return true
}

/**
 * After a refund frees inventory, put a sold_out show back on sale
 * if any sellable tier still has remaining capacity (and the room does).
 */
export async function maybeReopenSoldOutShow(showId: string): Promise<boolean> {
  const show = await Show.findById(showId)
  if (!show || show.status !== 'sold_out') return false

  const tiers = await resolveTiersForShow(show)
  if (exhausted(show, tiers)) return false

  show.status = 'on_sale'
  await show.save()
  return true
}
