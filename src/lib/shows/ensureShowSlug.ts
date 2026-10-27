import mongoose from 'mongoose'
import Show from '@/lib/models/Show'
import { showSlugFrom } from '@/lib/shows/publicPath'

type SlugShow = {
  _id: unknown
  city: string
  date: Date
  slug?: string | null
  save: () => Promise<unknown>
}

function isDuplicateKey(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000)
}

/** Fill a public slug on any show that does not have one yet. */
export async function ensureShowSlugs(shows: SlugShow[], opts?: { force?: boolean }) {
  const forceIds = new Set(opts?.force ? shows.map((show) => String(show._id)) : [])
  const needs = shows.filter((show) => forceIds.has(String(show._id)) || !String(show.slug || '').trim())
  if (!needs.length) return

  const existing = await Show.find({ slug: { $exists: true, $nin: [null, ''] } })
    .select('_id slug')
    .lean()
  const used = new Set(
    existing
      .filter((show) => !forceIds.has(String(show._id)))
      .map((show) => String(show.slug)),
  )

  for (const show of needs) {
    const base = showSlugFrom(show.city, show.date)
    let slug = base
    let n = 2
    while (used.has(slug)) slug = `${base}-${n++}`
    used.add(slug)
    show.slug = slug
    try {
      await show.save()
    } catch (error) {
      if (!isDuplicateKey(error)) throw error
      slug = `${base}-${String(show._id).slice(-4)}`
      while (used.has(slug)) slug = `${slug}-2`
      used.add(slug)
      show.slug = slug
      await show.save()
    }
  }
}

export async function findShowByPublicKey(key: string) {
  const value = decodeURIComponent(key || '').trim()
  if (!value) return null
  if (mongoose.isValidObjectId(value)) {
    const byId = await Show.findById(value).populate('tour')
    if (byId) return byId
  }
  return Show.findOne({ slug: value.toLowerCase() }).populate('tour')
}
