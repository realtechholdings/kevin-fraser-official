import type mongoose from 'mongoose'
import type { TourDocument } from '@/lib/models/Tour'
import type { ShowDocument } from '@/lib/models/Show'
import type { BonusContentDocument } from '@/lib/models/BonusContent'
import type { StudioCategory } from '@/lib/studio/categories'
import type { StudioContentDocument } from '@/lib/models/StudioContent'
import type { TicketTierDocument, TierOwnerType } from '@/lib/models/TicketTier'
import type { Kevin11Category, Kevin11OverlaySlot } from '@/lib/kevin11/categories'
import type { Kevin11ContentDocument } from '@/lib/models/Kevin11Content'
import { toWallIso } from '@/lib/wallDate'

export type PublicTour = {
  id: string
  title: string
  slug: string
  subtitle: string
  description: string
  coverImage: string
  coverImageKey: string
  bannerImage: string
  bannerImageKey: string
  bannerPosition: 'background' | 'above'
  bannerFocus: string
  ticketAccent: string
  ticketArtwork: string
  ticketArtworkKey: string
  featured: boolean
  published: boolean
  startDate: string | null
  endDate: string | null
}

export type PublicTicketTier = {
  id: string
  ownerType: TierOwnerType
  ownerId: string
  name: string
  slug: string
  description: string
  currency: string
  priceCents: number
  capacity: number
  ticketsSold: number
  soldOut: boolean
  /** Show-level: false means this class is not sold at this date. */
  offered?: boolean
  /** Table packages appear alongside classes in the buyer dropdown. */
  kind?: 'ticket' | 'table'
  /** Seats included when kind is table. */
  seats?: number
  sortOrder: number
  published: boolean
  legacy?: boolean
  /** Show-owned tier that inherits price/currency from the matching tour tier */
  inheritPrice?: boolean
  ticketAccent: string
  ticketArtwork: string
  ticketArtworkKey: string
}

export type PublicShow = {
  id: string
  tour: { id: string; title: string; slug: string }
  title: string
  date: string
  doorsTime: string
  showTime: string
  showEndTime: string
  country: string
  city: string
  venue: string
  address: string
  currency: string
  priceCents: number
  capacity: number
  ticketsSold: number
  status: string
  ticketsOnSaleAt: string | null
  featured: boolean
  published: boolean
  externalTicketUrl: string
  artworkImage: string
  artworkImageKey: string
  artworkPosition: string
  listImage: string
  listImageKey: string
  venueImage: string
  venueImageKey: string
  description: string
  upgradeOffers?: {
    fromSlug: string
    toSlug: string
    enabled: boolean
    discountCents: number
  }[]
  tiers?: PublicTicketTier[]
}

export type PublicBonusContent = {
  id: string
  title: string
  description: string
  mediaKey: string
  mediaUrl: string
  thumbnailKey: string
  thumbnailUrl: string
  mimeType: string
  sizeBytes: number
  sortOrder: number
  featured: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

export type PublicStudioContent = {
  id: string
  title: string
  description: string
  category: StudioCategory
  mediaKey: string
  mediaUrl: string
  thumbnailKey: string
  thumbnailUrl: string
  mimeType: string
  sizeBytes: number
  sortOrder: number
  featured: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

export type PublicKevin11Content = {
  id: string
  title: string
  description: string
  category: Kevin11Category
  mediaKey: string
  mediaUrl: string
  thumbnailKey: string
  thumbnailUrl: string
  mimeType: string
  sizeBytes: number
  ctaLabel: string
  ctaUrl: string
  overlaySlot: Kevin11OverlaySlot
  sortOrder: number
  featured: boolean
  published: boolean
  createdAt: string
  updatedAt: string
}

export function serializeTour(tour: TourDocument): PublicTour {
  const id = String(tour._id)
  const coverKey = tour.coverImageKey || ''
  const bannerKey = tour.bannerImageKey || ''
  const ticketArtKey = tour.ticketArtworkKey || ''
  const ticketAccent = String(tour.ticketAccent || '#FF6600').trim() || '#FF6600'
  return {
    id,
    title: tour.title,
    slug: tour.slug,
    subtitle: tour.subtitle || '',
    description: tour.description || '',
    coverImageKey: coverKey,
    bannerImageKey: bannerKey,
    coverImage:
      tour.coverImage ||
      (coverKey ? `/api/tours/${id}/cover` : ''),
    bannerImage:
      tour.bannerImage ||
      (bannerKey ? `/api/tours/${id}/banner` : ''),
    bannerPosition: tour.bannerPosition === 'above' ? 'above' : 'background',
    bannerFocus: tour.bannerFocus || 'center center',
    ticketAccent,
    ticketArtworkKey: ticketArtKey,
    ticketArtwork:
      tour.ticketArtwork ||
      (ticketArtKey ? `/api/tours/${id}/ticket-artwork` : ''),
    featured: Boolean(tour.featured),
    published: Boolean(tour.published),
    startDate: tour.startDate ? toWallIso(tour.startDate) : null,
    endDate: tour.endDate ? toWallIso(tour.endDate) : null,
  }
}

export function serializeShow(
  show: ShowDocument & { tour?: TourDocument | mongoose.Types.ObjectId },
  tiers?: PublicTicketTier[],
): PublicShow {
  const tour = show.tour
  const tourPayload =
    tour && typeof tour === 'object' && '_id' in tour
      ? {
          id: String(tour._id),
          title: (tour as TourDocument).title,
          slug: (tour as TourDocument).slug,
        }
      : { id: String(tour), title: '', slug: '' }

  const serializedTiers = tiers || []
  const fromPrice =
    serializedTiers.length > 0
      ? Math.min(...serializedTiers.map((t) => t.priceCents))
      : show.priceCents

  return {
    id: String(show._id),
    tour: tourPayload,
    title: show.title,
    date: toWallIso(show.date),
    doorsTime: show.doorsTime || '',
    showTime: show.showTime || '',
    showEndTime: show.showEndTime || '',
    country: show.country,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    currency: serializedTiers[0]?.currency || show.currency,
    priceCents: fromPrice,
    capacity: show.capacity || 0,
    ticketsSold: show.ticketsSold || 0,
    status: show.status,
    ticketsOnSaleAt: show.ticketsOnSaleAt ? toWallIso(show.ticketsOnSaleAt) : null,
    featured: Boolean(show.featured),
    published: Boolean(show.published),
    externalTicketUrl: show.externalTicketUrl || '',
    artworkImageKey: show.artworkImageKey || '',
    artworkImage:
      show.artworkImage ||
      (show.artworkImageKey ? `/api/shows/${String(show._id)}/artwork` : ''),
    artworkPosition: show.artworkPosition || 'center center',
    listImageKey: show.listImageKey || '',
    listImage:
      show.listImage ||
      (show.listImageKey ? `/api/shows/${String(show._id)}/list` : ''),
    venueImageKey: show.venueImageKey || '',
    venueImage:
      show.venueImage ||
      (show.venueImageKey ? `/api/shows/${String(show._id)}/venue` : ''),
    description: show.description || '',
    upgradeOffers: (show.upgradeOffers || []).map((o) => ({
      fromSlug: o.fromSlug,
      toSlug: o.toSlug,
      enabled: o.enabled !== false,
      discountCents: Math.max(0, Number(o.discountCents) || 0),
    })),
    tiers: serializedTiers,
  }
}

export function serializeTicketTier(tier: TicketTierDocument): PublicTicketTier {
  const id = String(tier._id)
  const ticketArtKey = tier.ticketArtworkKey || ''
  return {
    id,
    ownerType: tier.ownerType as TierOwnerType,
    ownerId: String(tier.ownerId),
    name: tier.name,
    slug: tier.slug,
    description: tier.description || '',
    currency: tier.currency,
    priceCents: tier.priceCents,
    capacity: tier.capacity || 0,
    ticketsSold: tier.ticketsSold || 0,
    soldOut: Boolean(tier.soldOut),
    offered: tier.offered !== false,
    kind: 'ticket' as const,
    sortOrder: tier.sortOrder || 0,
    published: Boolean(tier.published),
    inheritPrice: Boolean(tier.inheritPrice),
    ticketAccent: String(tier.ticketAccent || '').trim(),
    ticketArtworkKey: ticketArtKey,
    ticketArtwork:
      tier.ticketArtwork ||
      (ticketArtKey ? `/api/tiers/${id}/ticket-artwork` : ''),
  }
}

export function serializeBonusContent(item: BonusContentDocument): PublicBonusContent {
  return {
    id: String(item._id),
    title: item.title,
    description: item.description || '',
    mediaKey: item.mediaKey,
    mediaUrl: item.mediaUrl,
    thumbnailKey: item.thumbnailKey || '',
    thumbnailUrl: item.thumbnailUrl || '',
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes || 0,
    sortOrder: item.sortOrder || 0,
    featured: Boolean(item.featured),
    published: Boolean(item.published),
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  }
}

export function serializeStudioContent(item: StudioContentDocument): PublicStudioContent {
  return {
    id: String(item._id),
    title: item.title,
    description: item.description || '',
    category: item.category as StudioCategory,
    mediaKey: item.mediaKey,
    mediaUrl: item.mediaUrl,
    thumbnailKey: item.thumbnailKey || '',
    thumbnailUrl: item.thumbnailUrl || '',
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes || 0,
    sortOrder: item.sortOrder || 0,
    featured: Boolean(item.featured),
    published: Boolean(item.published),
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  }
}

export function serializeKevin11Content(item: Kevin11ContentDocument): PublicKevin11Content {
  return {
    id: String(item._id),
    title: item.title,
    description: item.description || '',
    category: item.category as Kevin11Category,
    mediaKey: item.mediaKey,
    mediaUrl: item.mediaUrl,
    thumbnailKey: item.thumbnailKey || '',
    thumbnailUrl: item.thumbnailUrl || '',
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes || 0,
    ctaLabel: item.ctaLabel || '',
    ctaUrl: item.ctaUrl || '',
    overlaySlot: (item.overlaySlot || 'none') as Kevin11OverlaySlot,
    sortOrder: item.sortOrder || 0,
    featured: Boolean(item.featured),
    published: Boolean(item.published),
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  }
}
