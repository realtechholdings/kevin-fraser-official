import { MetadataRoute } from 'next'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { ACTIVE_SHOW_FILTER } from '@/lib/shows/archive'
import { PUBLIC_SITE_ORIGIN, showPageUrl } from '@/lib/shows/eventSchema'

export const dynamic = 'force-dynamic'

function staticEntries(base: string, now: Date): MetadataRoute.Sitemap {
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/worlds/stage`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/worlds/showreel`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/worlds/studio`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/worlds/kevin11`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/worlds/connect`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/refund-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = PUBLIC_SITE_ORIGIN
  const now = new Date()
  const entries = staticEntries(base, now)

  try {
    await dbConnect()
    const shows = await Show.find({ published: true, ...ACTIVE_SHOW_FILTER })
      .select({ updatedAt: 1 })
      .lean()

    for (const show of shows) {
      entries.push({
        url: showPageUrl(String(show._id), base),
        lastModified: show.updatedAt ? new Date(show.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch (error) {
    console.error('Sitemap show listing failed:', error)
  }

  return entries
}
