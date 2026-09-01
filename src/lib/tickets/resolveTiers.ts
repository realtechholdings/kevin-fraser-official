import TicketTier, { type TicketTierDocument } from '@/lib/models/TicketTier'
import type { ShowDocument } from '@/lib/models/Show'
import { serializeTicketTier, type PublicTicketTier } from '@/lib/serialize'
import { tableToPublicTier, tablesForShows } from '@/lib/tickets/tables'

/**
 * Merge tour tiers with show-level overrides.
 *
 * - Tour tiers are the base price list for every show on the tour.
 * - A show tier with the same slug overrides the tour tier: it always carries
 *   the show's own allocation (capacity/ticketsSold), and either inherits the
 *   tour price/currency (inheritPrice) or overrides them.
 * - Name / description / branding fall back to the tour tier so show rows stay thin.
 * - Show tiers with slugs not present on the tour are appended as extras.
 * - A show override with offered === false is omitted entirely (this date only).
 * - Published table packages are appended as kind: 'table' offerings.
 */
function isOffered(tier: Pick<TicketTierDocument, 'offered'> | undefined) {
  return !tier || tier.offered !== false
}

function pricingBySlug(
  tourTiers: TicketTierDocument[],
  showTiers: TicketTierDocument[],
): Map<string, PublicTicketTier> {
  const map = new Map<string, PublicTicketTier>()
  for (const tourTier of tourTiers) {
    const serialized = serializeTicketTier(tourTier)
    serialized.ticketsSold = 0
    map.set(tourTier.slug, serialized)
  }
  for (const showTier of showTiers) {
    const serialized = serializeTicketTier(showTier)
    const tour = map.get(showTier.slug)
    if (tour) {
      serialized.name = tour.name
      if (showTier.inheritPrice) {
        serialized.priceCents = tour.priceCents
        serialized.currency = tour.currency
      }
      if (!serialized.ticketAccent) serialized.ticketAccent = tour.ticketAccent
      if (!serialized.ticketArtwork && !serialized.ticketArtworkKey) {
        serialized.ticketArtwork = tour.ticketArtwork
        serialized.ticketArtworkKey = tour.ticketArtworkKey
      }
    }
    map.set(showTier.slug, serialized)
  }
  return map
}

function mergeTiers(
  tourTiers: TicketTierDocument[],
  showTiers: TicketTierDocument[],
): PublicTicketTier[] {
  const overridesBySlug = new Map(showTiers.map((t) => [t.slug, t]))
  const tourSlugs = new Set(tourTiers.map((t) => t.slug))

  const merged: PublicTicketTier[] = []

  for (const tourTier of tourTiers) {
    const override = overridesBySlug.get(tourTier.slug)
    if (!isOffered(override)) continue

    if (!override) {
      const serialized = serializeTicketTier(tourTier)
      // No per-show row yet — don't show shared tour sold counts on every date.
      serialized.ticketsSold = 0
      merged.push(serialized)
      continue
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
    merged.push(serialized)
  }

  for (const showTier of showTiers) {
    if (!isOffered(showTier)) continue
    if (!tourSlugs.has(showTier.slug)) merged.push(serializeTicketTier(showTier))
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents)
}

function withTables(
  merged: PublicTicketTier[],
  tables: Awaited<ReturnType<typeof tablesForShows>>,
  tourTiers: TicketTierDocument[],
  showTiers: TicketTierDocument[],
): PublicTicketTier[] {
  if (!tables.length) return merged
  const bySlug = pricingBySlug(tourTiers, showTiers)
  const extras = tables.map((table) =>
    tableToPublicTier(table, bySlug.get(table.tierSlug) || null),
  )
  return [...merged, ...extras].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents,
  )
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
    offered: true,
    kind: 'ticket' as const,
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

  const [showTiers, tourTiers, tables] = await Promise.all([
    TicketTier.find({ ownerType: 'show', ownerId: showId, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    TicketTier.find({ ownerType: 'tour', ownerId: tourId, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    tablesForShows([showId]),
  ])

  if (!showTiers.length && !tourTiers.length) {
    const tableOfferings = withTables([], tables, tourTiers, showTiers)
    return tableOfferings.length ? tableOfferings : [legacyTier(show)]
  }
  return withTables(mergeTiers(tourTiers, showTiers), tables, tourTiers, showTiers)
}

export async function resolveTiersForShows(
  shows: Array<Pick<ShowDocument, '_id' | 'tour' | 'currency' | 'priceCents'>>,
): Promise<Record<string, PublicTicketTier[]>> {
  if (!shows.length) return {}

  const showIds = shows.map((s) => String(s._id))
  const tourIds = Array.from(new Set(shows.map(tourIdOf)))

  const [showTiers, tourTiers, tables] = await Promise.all([
    TicketTier.find({ ownerType: 'show', ownerId: { $in: showIds }, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    TicketTier.find({ ownerType: 'tour', ownerId: { $in: tourIds }, published: true }).sort({
      sortOrder: 1,
      priceCents: 1,
    }),
    tablesForShows(showIds),
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

  const tablesByShow = new Map<string, typeof tables>()
  for (const table of tables) {
    const key = String(table.show)
    const list = tablesByShow.get(key) || []
    list.push(table)
    tablesByShow.set(key, list)
  }

  const result: Record<string, PublicTicketTier[]> = {}
  for (const show of shows) {
    const showId = String(show._id)
    const fromShow = showMap.get(showId) || []
    const fromTour = tourMap.get(tourIdOf(show)) || []
    const showTables = tablesByShow.get(showId) || []
    const base =
      !fromShow.length && !fromTour.length ? [] : mergeTiers(fromTour, fromShow)
    const merged = withTables(base, showTables, fromTour, fromShow)
    result[showId] = merged.length ? merged : [legacyTier(show)]
  }

  return result
}
