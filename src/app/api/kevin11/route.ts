import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Kevin11Content, {
  KEVIN11_CATEGORIES,
  type Kevin11Category,
} from '@/lib/models/Kevin11Content'
import { serializeKevin11Content, type PublicKevin11Content } from '@/lib/serialize'
import { kevin11FilePath, publicUrlForKey } from '@/lib/r2'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { DEFAULT_KEVIN11_SETTINGS } from '@/lib/kevin11/categories'

export const dynamic = 'force-dynamic'

const MAX_PER_SIDE = 3

function resolveUrls(item: PublicKevin11Content): PublicKevin11Content {
  const mediaPublic = publicUrlForKey(item.mediaKey)
  const thumbPublic = item.thumbnailKey ? publicUrlForKey(item.thumbnailKey) : ''
  return {
    ...item,
    mediaUrl: mediaPublic || kevin11FilePath(item.id, 'media'),
    thumbnailUrl:
      thumbPublic || (item.thumbnailKey ? kevin11FilePath(item.id, 'thumbnail') : ''),
  }
}

function resolveOverlays(byCategory: Record<Kevin11Category, PublicKevin11Content[]>) {
  const comedy = [...byCategory.comedy]
  const other = [...byCategory.merch, ...byCategory.other]

  const pinnedLeft = comedy.filter((item) => item.overlaySlot === 'left')
  const pinnedRight = comedy.filter((item) => item.overlaySlot === 'right')
  const unpinnedComedy = comedy.filter((item) => item.overlaySlot === 'none')

  const left: PublicKevin11Content[] = []
  const right: PublicKevin11Content[] = []
  const used = new Set<string>()

  function take(list: PublicKevin11Content[], side: 'left' | 'right') {
    for (const item of list) {
      if (used.has(item.id)) continue
      if ((side === 'left' ? left : right).length >= MAX_PER_SIDE) break
      ;(side === 'left' ? left : right).push(item)
      used.add(item.id)
    }
  }

  take(pinnedLeft, 'left')
  take(pinnedRight, 'right')
  take(unpinnedComedy.filter((i) => i.featured), 'left')
  take(unpinnedComedy, 'left')
  take(other.filter((i) => i.featured), 'right')
  take(other, 'right')
  take(
    unpinnedComedy.filter((i) => !used.has(i.id)),
    'right',
  )

  return { left, right }
}

export async function GET() {
  try {
    await dbConnect()
    const [docs, settings] = await Promise.all([
      Kevin11Content.find({ published: true }).sort({
        category: 1,
        sortOrder: 1,
        createdAt: -1,
      }),
      getSiteSettings(),
    ])

    const items = docs.map((doc) => resolveUrls(serializeKevin11Content(doc)))
    const kevin11 = settings.kevin11 || DEFAULT_KEVIN11_SETTINGS

    const byCategory = KEVIN11_CATEGORIES.reduce(
      (acc, category) => {
        acc[category] = items.filter((item) => item.category === category)
        return acc
      },
      {} as Record<Kevin11Category, PublicKevin11Content[]>,
    )

    return NextResponse.json({
      success: true,
      categories: kevin11.categories,
      hoursHeading: kevin11.hoursHeading,
      items,
      byCategory,
      overlays: resolveOverlays(byCategory),
    })
  } catch (error) {
    console.error('Kevin11 GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load Kevin11 content.' }, { status: 500 })
  }
}
