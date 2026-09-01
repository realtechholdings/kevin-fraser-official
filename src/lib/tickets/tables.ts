import mongoose from 'mongoose'
import TicketTable, { type TicketTableDocument } from '@/lib/models/TicketTable'
import TicketTier, { slugifyTierName } from '@/lib/models/TicketTier'
import { normalizeCurrency } from '@/lib/currencies'
import { serializeTicketTier, type PublicTicketTier } from '@/lib/serialize'

export type ShowTableConfigInput = {
  id?: string
  name: string
  tierSlug: string
  seats?: number
  capacity?: number
  namePrefix?: string
  customNames?: string[] | string
  inheritPrice?: boolean
  priceCents?: number
  currency?: string
  soldOut?: boolean
  description?: string
  sortOrder?: number
}

export type PublicTicketTable = {
  id: string
  showId: string
  name: string
  slug: string
  description: string
  tierSlug: string
  seats: number
  capacity: number
  tablesSold: number
  namePrefix: string
  customNames: string[]
  inheritPrice: boolean
  priceCents: number
  currency: string
  soldOut: boolean
  published: boolean
  sortOrder: number
}

export function isTableOffering(
  tier: Pick<PublicTicketTier, 'kind'> | null | undefined,
): boolean {
  return tier?.kind === 'table'
}

export function parseCustomNames(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((n) => String(n || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(/\r?\n|,/)
    .map((n) => n.trim())
    .filter(Boolean)
}

export function nextTableNames(
  table: Pick<TicketTableDocument, 'namePrefix' | 'customNames'>,
  soldBefore: number,
  count: number,
): string[] {
  const prefix = String(table.namePrefix || 'Table').trim() || 'Table'
  const custom = parseCustomNames(table.customNames as unknown as string[])
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const index = soldBefore + i
    names.push(custom[index] || `${prefix} ${index + 1}`)
  }
  return names
}

export function tableNameForSeat(
  ticketNumber: number,
  seats: number,
  tableNames: string[] | undefined,
): string {
  if (!tableNames?.length || seats < 1) return ''
  const index = Math.floor((Math.max(1, ticketNumber) - 1) / seats)
  return tableNames[index] || tableNames[0] || ''
}

export function serializeTicketTable(table: TicketTableDocument): PublicTicketTable {
  return {
    id: String(table._id),
    showId: String(table.show),
    name: table.name,
    slug: table.slug,
    description: table.description || '',
    tierSlug: table.tierSlug,
    seats: Math.max(1, table.seats || 1),
    capacity: table.capacity || 0,
    tablesSold: table.tablesSold || 0,
    namePrefix: table.namePrefix || 'Table',
    customNames: parseCustomNames(table.customNames as unknown as string[]),
    inheritPrice: table.inheritPrice !== false,
    priceCents: table.priceCents || 0,
    currency: table.currency,
    soldOut: Boolean(table.soldOut),
    published: table.published !== false,
    sortOrder: table.sortOrder || 0,
  }
}

export function tableToPublicTier(
  table: TicketTableDocument,
  underlying: PublicTicketTier | null,
): PublicTicketTier {
  const seats = Math.max(1, table.seats || 1)
  const inherit = table.inheritPrice !== false
  const unit = underlying?.priceCents || 0
  const priceCents = inherit ? unit * seats : Math.max(0, table.priceCents || 0)
  const currency = inherit
    ? underlying?.currency || table.currency
    : table.currency
  const classLabel = underlying?.name || table.tierSlug
  return {
    id: String(table._id),
    ownerType: 'show',
    ownerId: String(table.show),
    name: table.name,
    slug: table.slug,
    description:
      table.description || `${seats} × ${classLabel} · named table`,
    currency,
    priceCents,
    capacity: table.capacity || 0,
    ticketsSold: table.tablesSold || 0,
    soldOut: Boolean(table.soldOut),
    offered: true,
    sortOrder: table.sortOrder || 1000,
    published: table.published !== false,
    kind: 'table',
    seats,
    inheritPrice: inherit,
    ticketAccent: underlying?.ticketAccent || '',
    ticketArtwork: underlying?.ticketArtwork || '',
    ticketArtworkKey: underlying?.ticketArtworkKey || '',
  }
}

export async function applyShowTableConfigs(
  showId: string,
  configs: ShowTableConfigInput[],
) {
  const existing = await TicketTable.find({ show: showId })
  const existingById = new Map(existing.map((row) => [String(row._id), row]))
  const kept = new Set<string>()
  const usedSlugs = new Set<string>()

  for (const [index, config] of configs.entries()) {
    const name = String(config.name || '').trim()
    const tierSlug = String(config.tierSlug || '').trim().toLowerCase()
    if (!name || !tierSlug) continue

    const seats = Math.max(1, Number(config.seats) || 1)
    const capacity = Math.max(0, Number(config.capacity) || 0)
    const inheritPrice = config.inheritPrice !== false
    const customNames = parseCustomNames(config.customNames)
    let slug = slugifyTierName(name)
    if (usedSlugs.has(slug)) slug = `${slug}-${index + 1}`
    usedSlugs.add(slug)

    const id = String(config.id || '')
    const row =
      (id && existingById.get(id)) ||
      existing.find((item) => item.slug === slug && !kept.has(String(item._id)))

    const payload = {
      show: showId,
      name,
      slug,
      description: String(config.description || '').trim(),
      tierSlug,
      seats,
      capacity,
      namePrefix: String(config.namePrefix || 'Table').trim() || 'Table',
      customNames,
      inheritPrice,
      priceCents: inheritPrice ? 0 : Math.max(0, Number(config.priceCents) || 0),
      currency: normalizeCurrency(config.currency),
      soldOut: Boolean(config.soldOut),
      published: true,
      sortOrder: Number.isFinite(Number(config.sortOrder)) ? Number(config.sortOrder) : index,
    }

    if (row) {
      Object.assign(row, payload)
      await row.save()
      kept.add(String(row._id))
    } else {
      const created = await TicketTable.create({
        ...payload,
        tablesSold: 0,
      })
      kept.add(String(created._id))
    }
  }

  for (const row of existing) {
    if (kept.has(String(row._id))) continue
    if (row.tablesSold > 0) {
      row.published = false
      await row.save()
    } else {
      await row.deleteOne()
    }
  }
}

export async function findTierForShowSlug(
  showId: string,
  tourId: string,
  slug: string,
): Promise<PublicTicketTier | null> {
  const [showTier, tourTier] = await Promise.all([
    TicketTier.findOne({ ownerType: 'show', ownerId: showId, slug }),
    TicketTier.findOne({ ownerType: 'tour', ownerId: tourId, slug }),
  ])
  if (!showTier && !tourTier) return null
  if (!showTier) return serializeTicketTier(tourTier!)
  const serialized = serializeTicketTier(showTier)
  if (showTier.inheritPrice && tourTier) {
    serialized.priceCents = tourTier.priceCents
    serialized.currency = tourTier.currency
    serialized.name = tourTier.name
    serialized.ticketAccent = serialized.ticketAccent || tourTier.ticketAccent || ''
    serialized.ticketArtwork = serialized.ticketArtwork || tourTier.ticketArtwork || ''
    serialized.ticketArtworkKey =
      serialized.ticketArtworkKey || tourTier.ticketArtworkKey || ''
  }
  return serialized
}

export async function tablesForShows(
  showIds: string[],
): Promise<TicketTableDocument[]> {
  if (!showIds.length) return []
  const objectIds = showIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  if (!objectIds.length) return []
  return TicketTable.find({
    show: { $in: objectIds },
    published: true,
  }).sort({ sortOrder: 1, name: 1 })
}
