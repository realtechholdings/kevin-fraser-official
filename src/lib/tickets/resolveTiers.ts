import TicketTier, { type TicketTierDocument } from '@/lib/models/TicketTier'
import type { ShowDocument } from '@/lib/models/Show'
import { serializeTicketTier, type PublicTicketTier } from '@/lib/serialize'

export async function resolveTiersForShow(
  show: Pick<ShowDocument, '_id' | 'tour' | 'currency' | 'priceCents'>,
): Promise<PublicTicketTier[]> {
  const showId = String(show._id)
  const tourId =
    show.tour && typeof show.tour === 'object' && '_id' in show.tour
      ? String((show.tour as { _id: unknown })._id)
      : String(show.tour)

  const showTiers = await TicketTier.find({
    ownerType: 'show',
    ownerId: showId,
    published: true,
  }).sort({ sortOrder: 1, priceCents: 1 })

  if (showTiers.length > 0) {
    return showTiers.map(serializeTicketTier)
  }

  const tourTiers = await TicketTier.find({
    ownerType: 'tour',
    ownerId: tourId,
    published: true,
  }).sort({ sortOrder: 1, priceCents: 1 })

  if (tourTiers.length > 0) {
    return tourTiers.map(serializeTicketTier)
  }

  // Legacy fallback: single price on the show
  return [
    {
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
      sortOrder: 0,
      published: true,
      legacy: true,
    },
  ]
}

export async function resolveTiersForShows(
  shows: Array<Pick<ShowDocument, '_id' | 'tour' | 'currency' | 'priceCents'>>,
): Promise<Record<string, PublicTicketTier[]>> {
  if (!shows.length) return {}

  const showIds = shows.map((s) => String(s._id))
  const tourIds = Array.from(
    new Set(
      shows.map((s) =>
        s.tour && typeof s.tour === 'object' && '_id' in s.tour
          ? String((s.tour as { _id: unknown })._id)
          : String(s.tour),
      ),
    ),
  )

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
    const tourId =
      show.tour && typeof show.tour === 'object' && '_id' in show.tour
        ? String((show.tour as { _id: unknown })._id)
        : String(show.tour)

    const fromShow = showMap.get(showId)
    if (fromShow?.length) {
      result[showId] = fromShow.map(serializeTicketTier)
      continue
    }

    const fromTour = tourMap.get(tourId)
    if (fromTour?.length) {
      result[showId] = fromTour.map(serializeTicketTier)
      continue
    }

    result[showId] = [
      {
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
        sortOrder: 0,
        published: true,
        legacy: true,
      },
    ]
  }

  return result
}
