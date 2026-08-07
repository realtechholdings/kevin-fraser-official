import TicketTier from '@/lib/models/TicketTier'
import { normalizeCurrency } from '@/lib/currencies'

export type ShowTierConfigInput = {
  slug: string
  capacity?: number
  overridePrice?: boolean
  priceCents?: number
  currency?: string
  soldOut?: boolean
}

/**
 * Apply per-show tier configs against the owning tour's tiers.
 *
 * For each tour tier the admin can set a per-show allocation, optionally
 * override the price/currency, and mark the tier sold out. An active config
 * is stored as a show-owned TicketTier with the same slug (picked up by
 * resolveTiers as an override). Clearing a config removes the override so
 * the show falls back to the tour tier — unless tickets were already sold
 * against it.
 */
export async function applyShowTierConfigs(
  showId: string,
  tourId: string,
  configs: ShowTierConfigInput[],
) {
  const [tourTiers, existingShowTiers] = await Promise.all([
    TicketTier.find({ ownerType: 'tour', ownerId: tourId }),
    TicketTier.find({ ownerType: 'show', ownerId: showId }),
  ])
  const tourBySlug = new Map(tourTiers.map((t) => [t.slug, t]))
  const existingBySlug = new Map(existingShowTiers.map((t) => [t.slug, t]))

  for (const config of configs) {
    const slug = String(config.slug || '').trim().toLowerCase()
    const tourTier = tourBySlug.get(slug)
    if (!tourTier) continue

    const capacity = Math.max(0, Number(config.capacity) || 0)
    const overridePrice = Boolean(config.overridePrice)
    const soldOut = Boolean(config.soldOut)
    const active = capacity > 0 || overridePrice || soldOut
    const existing = existingBySlug.get(slug)

    if (!active) {
      if (existing && !(existing.ticketsSold > 0)) {
        await existing.deleteOne()
      } else if (existing) {
        existing.capacity = 0
        existing.inheritPrice = true
        existing.soldOut = false
        await existing.save()
      }
      continue
    }

    const priceCents = overridePrice
      ? Math.max(0, Number(config.priceCents) || 0)
      : tourTier.priceCents
    const currency = overridePrice
      ? normalizeCurrency(config.currency, normalizeCurrency(tourTier.currency))
      : tourTier.currency

    if (existing) {
      existing.name = tourTier.name
      existing.description = existing.description || tourTier.description
      existing.capacity = capacity
      existing.inheritPrice = !overridePrice
      existing.priceCents = priceCents
      existing.currency = currency
      existing.soldOut = soldOut
      existing.sortOrder = tourTier.sortOrder
      existing.published = true
      await existing.save()
    } else {
      await TicketTier.create({
        ownerType: 'show',
        ownerId: showId,
        name: tourTier.name,
        slug,
        description: tourTier.description,
        currency,
        priceCents,
        inheritPrice: !overridePrice,
        capacity,
        ticketsSold: 0,
        soldOut,
        sortOrder: tourTier.sortOrder,
        published: true,
      })
    }
  }
}
