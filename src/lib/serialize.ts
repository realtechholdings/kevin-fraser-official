import type mongoose from 'mongoose'
import type { TourDocument } from '@/lib/models/Tour'
import type { ShowDocument } from '@/lib/models/Show'
import type { BonusContentDocument } from '@/lib/models/BonusContent'
import type { StudioCategory } from '@/lib/studio/categories'
import type { StudioContentDocument } from '@/lib/models/StudioContent'
import type { TicketTierDocument, TierOwnerType } from '@/lib/models/TicketTier'
import type { Kevin11Category, Kevin11OverlaySlot } from '@/lib/kevin11/categories'
import type { Kevin11ContentDocument } from '@/lib/models/Kevin11Content'

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
  sortOrder: number
  published: boolean
  legacy?: boolean
}

export type PublicShow = {
  id: string
  tour: { id: string; title: string; slug: string }
  title: string
  date: string
  doorsTime: string
  showTime: string
  country: string
  city: string
  venue: string
  address: string
  currency: string
  priceCents: number
  capacity: number
  ticketsSold: number
  status: string
  featured: boolean
  published: boolean
  externalTicketUrl: string
  artworkImage: string
  artworkImageKey: string
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
    featured: Boolean(tour.featured),
    published: Boolean(tour.published),
    startDate: tour.startDate ? new Date(tour.startDate).toISOString() : null,
    endDate: tour.endDate ? new Date(tour.endDate).toISOString() : null,
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
    date: new Date(show.date).toISOString(),
    doorsTime: show.doorsTime || '',
    showTime: show.showTime || '',
    country: show.country,
    city: show.city,
    venue: show.venue,
    address: show.address || '',
    currency: serializedTiers[0]?.currency || show.currency,
    priceCents: fromPrice,
    capacity: show.capacity || 0,
    ticketsSold: show.ticketsSold || 0,
    status: show.status,
    featured: Boolean(show.featured),
    published: Boolean(show.published),
    externalTicketUrl: show.externalTicketUrl || '',
    artworkImageKey: show.artworkImageKey || '',
    artworkImage:
      show.artworkImage ||
      (show.artworkImageKey ? `/api/shows/${String(show._id)}/artwork` : ''),
    tiers: serializedTiers,
  }
}

export function serializeTicketTier(tier: TicketTierDocument): PublicTicketTier {
  return {
    id: String(tier._id),
    ownerType: tier.ownerType as TierOwnerType,
    ownerId: String(tier.ownerId),
    name: tier.name,
    slug: tier.slug,
    description: tier.description || '',
    currency: tier.currency,
    priceCents: tier.priceCents,
    capacity: tier.capacity || 0,
    ticketsSold: tier.ticketsSold || 0,
    sortOrder: tier.sortOrder || 0,
    published: Boolean(tier.published),
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
