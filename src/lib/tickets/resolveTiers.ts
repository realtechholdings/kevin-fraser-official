import TicketTier, { type TicketTierDocument } from '@/lib/models/TicketTier'
import type { ShowDocument } from '@/lib/models/Show'
import { serializeTicketTier, type PublicTicketTier } from '@/lib/serialize'

/**
 * Merge tour tiers with show-level overrides.
 *
 * - Tour tiers are the base price list for every show on the tour.
 * - A show tier with the same slug overrides the tour tier: it always carries
 *   the show's own allocation (capacity/ticketsSold), and either inherits the
 *   tour price/currency (inheritPrice) or overrides them.
 * - Name / description / branding fall back to the tour tier so show rows stay thin.
 * - Show tiers with slugs not present on the tour are appended as extras.
 */
function mergeTiers(
  tourTiers: TicketTierDocument[],
  showTiers: TicketTierDocument[],
): PublicTicketTier[] {
  const overridesBySlug = new Map(showTiers.map((t) => [t.slug, t]))
  const tourSlugs = new Set(tourTiers.map((t) => t.slug))

  const merged: PublicTicketTier[] = tourTiers.map((tourTier) => {
    const override = overridesBySlug.get(tourTier.slug)
    if (!override) {
      const serialized = serializeTicketTier(tourTier)
      // No per-show row yet — don't show shared tour sold counts on every date.
      serialized.ticketsSold = 0
      return serialized
    }

    const serialized = serializeTicketTier(override)
    // Keep identity + branding with the tour definition.
    serialized.name = tourTier.name
    serialized.sortOrder = tourTier.sortOrder
    if (override.inheritPrice) {
      serialized.priceCents = tourTier.priceCents
      serialized.currency = tourTier.currency
    }
    if (!serialized.description && tourTier.description) {
      serialized.description = tourTier.description
    }
    if (!serialized.ticketAccent && tourTier.ticketAccent) {
      serialized.ticketAccent = tourTier.ticketAccent
    }
    if (!serialized.ticketArtwork && !serialized.ticketArtworkKey) {
      serialized.ticketArtwork = tourTier.ticketArtwork || ''
      serialized.ticketArtworkKey = tourTier.ticketArtworkKey || ''
    }
    return serialized
  })

  for (const showTier of showTiers) {
    if (!tourSlugs.has(showTier.slug)) merged.push(serializeTicketTier(showTier))
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents)
}

function legacyTier(
  show: Pick<ShowDocument, '_id' | 'currency' | 'priceCents'>,
): PublicTicketTier {
  const showId = String(show._id)
  return {
    id: `legacy-${showId}`,
    ownerType: 'show',
    ownerId: showId,
    name: 'General Admission',
    slug: 'general-admission',
    description: '',
    currency: show.currency,
    priceCents: show.priceCents,
    capacity: 0,
    ticketsSold: 0,
    soldOut: false,
    sortOrder: 0,
    published: true,
    legacy: true,
    ticketAccent: '',
    ticketArtwork: '',
    ticketArtworkKey: '',
  }
}

function tourIdOf(show: Pick<ShowDocument, 'tour'>) {
  return show.tour && typeof show.tour === 'object' && '_id' in show.tour
    ? String((show.tour as { _id: unknown })._id)
    : String(show.tour)
}

export async function resolveTiersForShow(
  show: Pick<ShowDocument, '_id' | 'tour' | 'currency' | 'priceCents'>,
): Promise<PublicTicketTier[]> {
  const showId = String(show._id)
  const tourId = tourIdOf(show)

  const [showTiers, tourTiers] = await Promise.all([
    TicketTier.find({ ownerType: 'show', ownerId: showId, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    TicketTier.find({ ownerType: 'tour', ownerId: tourId, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
  ])

  if (!showTiers.length && !tourTiers.length) return [legacyTier(show)]
  return mergeTiers(tourTiers, showTiers)
}

export async function resolveTiersForShows(
  shows: Array<Pick<ShowDocument, '_id' | 'tour' | 'currency' | 'priceCents'>>,
): Promise<Record<string, PublicTicketTier[]>> {
  if (!shows.length) return {}

  const showIds = shows.map((s) => String(s._id))
  const tourIds = Array.from(new Set(shows.map(tourIdOf)))

  const [showTiers, tourTiers] = await Promise.all([
    TicketTier.find({ ownerType: 'show', ownerId: { $in: showIds }, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    TicketTier.find({ ownerType: 'tour', ownerId: { $in: tourIds }, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
  ])

  const showMap = new Map<string, TicketTierDocument[]>()
  for (const tier of showTiers) {
    const key = String(tier.ownerId)
    const list = showMap.get(key) || []
    list.push(tier)
    showMap.set(key, list)
  }

  const tourMap = new Map<string, TicketTierDocument[]>()
  for (const tier of tourTiers) {
    const key = String(tier.ownerId)
    const list = tourMap.get(key) || []
    list.push(tier)
    tourMap.set(key, list)
  }

  const result: Record<string, PublicTicketTier[]> = {}
  for (const show of shows) {
    const showId = String(show._id)
    const fromShow = showMap.get(showId) || []
    const fromTour = tourMap.get(tourIdOf(show)) || []
    result[showId] =
      !fromShow.length && !fromTour.length
        ? [legacyTier(show)]
        : mergeTiers(fromTour, fromShow)
  }

  return result
}
