import Show from '@/lib/models/Show'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { areAllTiersSoldOut } from '@/lib/tickets/soldOut'

/**
 * Flip an on-sale show to sold_out when all sellable tiers are gone.
 * Does not overwrite cancelled / coming_soon / already sold_out.
 */
export async function maybeMarkShowSoldOut(showId: string): Promise<boolean> {
  const show = await Show.findById(showId)
  if (!show || show.status !== 'on_sale') return false

  const tiers = await resolveTiersForShow(show)
  if (!areAllTiersSoldOut(tiers)) return false

  show.status = 'sold_out'
  await show.save()
  return true
}
