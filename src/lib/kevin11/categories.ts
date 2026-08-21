import { slugify } from '@/lib/format'

export const KEVIN11_CATEGORIES = ['comedy', 'merch', 'other'] as const

export type Kevin11Category = (typeof KEVIN11_CATEGORIES)[number]

export type Kevin11CategoryDef = {
  id: Kevin11Category
  label: string
  sortOrder: number
}

export const DEFAULT_KEVIN11_CATEGORY_DEFS: Kevin11CategoryDef[] = [
  { id: 'comedy', label: 'Comedy', sortOrder: 0 },
  { id: 'merch', label: 'Merch', sortOrder: 1 },
  { id: 'other', label: 'Other', sortOrder: 2 },
]

export const KEVIN11_CATEGORY_LABELS: Record<Kevin11Category, string> = {
  comedy: 'Comedy',
  merch: 'Merch',
  other: 'Other',
}

export const DEFAULT_KEVIN11_HOURS_HEADING = 'Open Eventually.'

export type Kevin11Settings = {
  /** Overlay hours / status heading on the Kevin11 page */
  hoursHeading: string
  categories: Kevin11CategoryDef[]
}

export const DEFAULT_KEVIN11_SETTINGS: Kevin11Settings = {
  hoursHeading: DEFAULT_KEVIN11_HOURS_HEADING,
  categories: DEFAULT_KEVIN11_CATEGORY_DEFS.map((c) => ({ ...c })),
}

export const KEVIN11_OVERLAY_SLOTS = ['none', 'left', 'right'] as const

export type Kevin11OverlaySlot = (typeof KEVIN11_OVERLAY_SLOTS)[number]

export function isKevin11Category(value: string): value is Kevin11Category {
  return (KEVIN11_CATEGORIES as readonly string[]).includes(value)
}

export function kevin11CategoryLabel(
  categoryId: string,
  categories?: Kevin11CategoryDef[] | null,
) {
  const fromSettings = categories?.find((c) => c.id === categoryId)?.label
  if (fromSettings) return fromSettings
  if (isKevin11Category(categoryId)) return KEVIN11_CATEGORY_LABELS[categoryId]
  return categoryId.replace(/_/g, ' ')
}

export function normalizeKevin11Settings(
  value?: Partial<Kevin11Settings> | null,
): Kevin11Settings {
  const hoursHeading =
    String(value?.hoursHeading ?? DEFAULT_KEVIN11_HOURS_HEADING).trim() ||
    DEFAULT_KEVIN11_HOURS_HEADING

  const incoming = Array.isArray(value?.categories) ? value!.categories : []
  const byId = new Map<string, { label: string; sortOrder: number }>()
  incoming.forEach((item, index) => {
    const id = slugify(String(item?.id || '').trim())
    if (!isKevin11Category(id)) return
    const label = String(item?.label || '').trim()
    if (!label) return
    const sortOrder = Number.isFinite(Number(item?.sortOrder))
      ? Number(item?.sortOrder)
      : index
    byId.set(id, { label, sortOrder })
  })

  const categories = DEFAULT_KEVIN11_CATEGORY_DEFS.map((def, index) => {
    const override = byId.get(def.id)
    return {
      id: def.id,
      label: override?.label || def.label,
      sortOrder: override?.sortOrder ?? index,
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((c, index) => ({ ...c, sortOrder: index }))

  return { hoursHeading, categories }
}
