import type mongoose from 'mongoose'
import type { TourDocument } from '@/lib/models/Tour'
import type { ShowDocument } from '@/lib/models/Show'
import type { BonusContentDocument } from '@/lib/models/BonusContent'

export type PublicTour = {
  id: string
  title: string
  slug: string
  subtitle: string
  description: string
  coverImage: string
  featured: boolean
  published: boolean
  startDate: string | null
  endDate: string | null
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

export function serializeTour(tour: TourDocument): PublicTour {
  return {
    id: String(tour._id),
    title: tour.title,
    slug: tour.slug,
    subtitle: tour.subtitle || '',
    description: tour.description || '',
    coverImage: tour.coverImage || '',
    featured: Boolean(tour.featured),
    published: Boolean(tour.published),
    startDate: tour.startDate ? new Date(tour.startDate).toISOString() : null,
    endDate: tour.endDate ? new Date(tour.endDate).toISOString() : null,
  }
}

export function serializeShow(
  show: ShowDocument & { tour?: TourDocument | mongoose.Types.ObjectId }
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
    currency: show.currency,
    priceCents: show.priceCents,
    capacity: show.capacity || 0,
    ticketsSold: show.ticketsSold || 0,
    status: show.status,
    featured: Boolean(show.featured),
    published: Boolean(show.published),
    externalTicketUrl: show.externalTicketUrl || '',
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
