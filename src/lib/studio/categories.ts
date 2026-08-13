import { slugify } from '@/lib/format'

/** Built-in defaults — seeded into site settings and used as fallback. */
export const DEFAULT_STUDIO_CATEGORY_DEFS = [
  { id: 'behind_the_scenes', label: 'Behind the Scenes', sortOrder: 0 },
  { id: 'characters', label: 'Characters', sortOrder: 1 },
  { id: 'creative_process', label: 'Creative Process', sortOrder: 2 },
] as const

/** @deprecated Prefer StudioCategoryDef.id from settings — kept for older imports. */
export const STUDIO_CATEGORIES = DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => c.id)

export type StudioCategory = string

export type StudioCategoryDef = {
  id: string
  label: string
  sortOrder: number
}

export const STUDIO_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => [c.id, c.label]),
)

export function studioCategoryLabel(
  categoryId: string,
  categories?: StudioCategoryDef[] | null,
) {
  const fromSettings = categories?.find((c) => c.id === categoryId)?.label
  if (fromSettings) return fromSettings
  return STUDIO_CATEGORY_LABELS[categoryId] || categoryId.replace(/_/g, ' ')
}

export function normalizeStudioCategoryDef(
  value?: Partial<StudioCategoryDef> | null,
  fallbackSort = 0,
): StudioCategoryDef | null {
  const label = String(value?.label || '').trim()
  const rawId = String(value?.id || '').trim()
  const id = slugify(rawId || label)
  if (!id || !label) return null
  const sortOrder = Number.isFinite(Number(value?.sortOrder))
    ? Number(value?.sortOrder)
    : fallbackSort
  return { id, label, sortOrder }
}

export function normalizeStudioCategories(
  value?: Array<Partial<StudioCategoryDef>> | null,
): StudioCategoryDef[] {
  const list = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const normalized: StudioCategoryDef[] = []

  list.forEach((item, index) => {
    const def = normalizeStudioCategoryDef(item, index)
    if (!def || seen.has(def.id)) return
    seen.add(def.id)
    normalized.push(def)
  })

  if (normalized.length === 0) {
    return DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c }))
  }

  return normalized
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((c, index) => ({ ...c, sortOrder: index }))
}

export function categoryIds(categories: StudioCategoryDef[]) {
  return categories.map((c) => c.id)
}
