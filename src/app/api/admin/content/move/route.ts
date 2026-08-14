import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import StudioContent from '@/lib/models/StudioContent'
import BonusContent from '@/lib/models/BonusContent'
import Kevin11Content from '@/lib/models/Kevin11Content'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { KEVIN11_CATEGORIES, type Kevin11Category } from '@/lib/kevin11/categories'
import {
  serializeBonusContent,
  serializeKevin11Content,
  serializeStudioContent,
} from '@/lib/serialize'

export type ContentContainer = 'studio' | 'bonus' | 'kevin11'

type SharedFields = {
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
}

function proxyMediaUrl(container: ContentContainer, id: string, kind: 'file' | 'thumbnail') {
  if (container === 'studio') {
    return kind === 'file' ? `/api/studio/${id}/file` : `/api/studio/${id}/thumbnail`
  }
  if (container === 'bonus') {
    return kind === 'file' ? `/api/bonus/${id}/file` : `/api/bonus/${id}/thumbnail`
  }
  return kind === 'file' ? `/api/kevin11/${id}/file` : `/api/kevin11/${id}/thumbnail`
}

function rewriteUrl(
  url: string,
  from: ContentContainer,
  to: ContentContainer,
  fromId: string,
  toId: string,
) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const fromFile = proxyMediaUrl(from, fromId, 'file')
  const fromThumb = proxyMediaUrl(from, fromId, 'thumbnail')
  if (url === fromFile || url.includes(`/${fromId}/file`)) {
    return proxyMediaUrl(to, toId, 'file')
  }
  if (url === fromThumb || url.includes(`/${fromId}/thumbnail`)) {
    return proxyMediaUrl(to, toId, 'thumbnail')
  }
  return url
}

async function loadSource(container: ContentContainer, id: string) {
  if (container === 'studio') return StudioContent.findById(id)
  if (container === 'bonus') return BonusContent.findById(id)
  return Kevin11Content.findById(id)
}

async function deleteSource(container: ContentContainer, id: string) {
  if (container === 'studio') return StudioContent.findByIdAndDelete(id)
  if (container === 'bonus') return BonusContent.findByIdAndDelete(id)
  return Kevin11Content.findByIdAndDelete(id)
}

function sharedFromDoc(doc: {
  title: string
  description?: string | null
  mediaKey: string
  mediaUrl: string
  thumbnailKey?: string | null
  thumbnailUrl?: string | null
  mimeType: string
  sizeBytes?: number | null
  sortOrder?: number | null
  featured?: boolean | null
  published?: boolean | null
}): SharedFields {
  return {
    title: doc.title,
    description: doc.description || '',
    mediaKey: doc.mediaKey,
    mediaUrl: doc.mediaUrl,
    thumbnailKey: doc.thumbnailKey || '',
    thumbnailUrl: doc.thumbnailUrl || '',
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes || 0,
    sortOrder: doc.sortOrder || 0,
    featured: Boolean(doc.featured),
    published: doc.published !== false,
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const from = String(body.from || '').trim() as ContentContainer
    const to = String(body.to || '').trim() as ContentContainer
    const id = String(body.id || '').trim()
    const category = String(body.category || '').trim()

    if (!['studio', 'bonus', 'kevin11'].includes(from) || !['studio', 'bonus', 'kevin11'].includes(to)) {
      return NextResponse.json({ success: false, error: 'Invalid container.' }, { status: 400 })
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'id required.' }, { status: 400 })
    }
    if (from === to) {
      return NextResponse.json(
        { success: false, error: 'Choose a different destination container.' },
        { status: 400 },
      )
    }

    await dbConnect()
    const source = await loadSource(from, id)
    if (!source) {
      return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 })
    }

    const shared = sharedFromDoc(source)

    let result:
      | ReturnType<typeof serializeStudioContent>
      | ReturnType<typeof serializeBonusContent>
      | ReturnType<typeof serializeKevin11Content>

    if (to === 'studio') {
      const settings = await getSiteSettings({ bypassCache: true })
      const categories = settings.studio.categories
      const nextCategory =
        category && categories.some((c) => c.id === category)
          ? category
          : categories[0]?.id || 'behind_the_scenes'

      const created = await StudioContent.create({
        ...shared,
        category: nextCategory,
        mediaUrl: shared.mediaUrl,
        thumbnailUrl: shared.thumbnailUrl,
      })
      const toId = String(created._id)
      created.mediaUrl = rewriteUrl(shared.mediaUrl, from, to, id, toId) || proxyMediaUrl(to, toId, 'file')
      if (shared.thumbnailKey || shared.thumbnailUrl) {
        created.thumbnailUrl =
          rewriteUrl(shared.thumbnailUrl, from, to, id, toId) ||
          proxyMediaUrl(to, toId, 'thumbnail')
      }
      await created.save()
      await deleteSource(from, id)
      result = serializeStudioContent(created)
    } else if (to === 'bonus') {
      const created = await BonusContent.create({
        ...shared,
        mediaUrl: shared.mediaUrl,
        thumbnailUrl: shared.thumbnailUrl,
      })
      const toId = String(created._id)
      created.mediaUrl = rewriteUrl(shared.mediaUrl, from, to, id, toId) || proxyMediaUrl(to, toId, 'file')
      if (shared.thumbnailKey || shared.thumbnailUrl) {
        created.thumbnailUrl =
          rewriteUrl(shared.thumbnailUrl, from, to, id, toId) ||
          proxyMediaUrl(to, toId, 'thumbnail')
      }
      await created.save()
      await deleteSource(from, id)
      result = serializeBonusContent(created)
    } else {
      const nextCategory = (KEVIN11_CATEGORIES as readonly string[]).includes(category)
        ? (category as Kevin11Category)
        : 'other'
      const created = await Kevin11Content.create({
        ...shared,
        category: nextCategory,
        ctaLabel: '',
        ctaUrl: '',
        overlaySlot: 'none',
        mediaUrl: shared.mediaUrl,
        thumbnailUrl: shared.thumbnailUrl,
      })
      const toId = String(created._id)
      created.mediaUrl = rewriteUrl(shared.mediaUrl, from, to, id, toId) || proxyMediaUrl(to, toId, 'file')
      if (shared.thumbnailKey || shared.thumbnailUrl) {
        created.thumbnailUrl =
          rewriteUrl(shared.thumbnailUrl, from, to, id, toId) ||
          proxyMediaUrl(to, toId, 'thumbnail')
      }
      await created.save()
      await deleteSource(from, id)
      result = serializeKevin11Content(created)
    }

    return NextResponse.json({ success: true, item: result, to })
  } catch (error) {
    console.error('Content move:', error)
    return NextResponse.json({ success: false, error: 'Move failed.' }, { status: 500 })
  }
}
