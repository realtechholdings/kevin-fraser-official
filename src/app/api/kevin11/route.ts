import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Kevin11Content, {
  KEVIN11_CATEGORIES,
  type Kevin11Category,
} from '@/lib/models/Kevin11Content'
import { serializeKevin11Content, type PublicKevin11Content } from '@/lib/serialize'
import { kevin11FilePath, publicUrlForKey } from '@/lib/r2'

export const dynamic = 'force-dynamic'

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

/** Pick comedy items for the hero left/right slots. */
function resolveOverlays(comedy: PublicKevin11Content[]) {
  const left =
    comedy.find((item) => item.overlaySlot === 'left') ||
    comedy.find((item) => item.featured) ||
    comedy[0] ||
    null
  const right =
    comedy.find((item) => item.overlaySlot === 'right' && item.id !== left?.id) ||
    comedy.find((item) => item.id !== left?.id && item.featured) ||
    comedy.find((item) => item.id !== left?.id) ||
    null

  return { left, right }
}

export async function GET() {
  try {
    await dbConnect()
    const docs = await Kevin11Content.find({ published: true }).sort({
      category: 1,
      sortOrder: 1,
      createdAt: -1,
    })

    const items = docs.map((doc) => resolveUrls(serializeKevin11Content(doc)))

    const byCategory = KEVIN11_CATEGORIES.reduce(
      (acc, category) => {
        acc[category] = items.filter((item) => item.category === category)
        return acc
      },
      {} as Record<Kevin11Category, PublicKevin11Content[]>,
    )

    const overlays = resolveOverlays(byCategory.comedy)

    return NextResponse.json({
      success: true,
      categories: KEVIN11_CATEGORIES,
      items,
      byCategory,
      overlays,
    })
  } catch (error) {
    console.error('Kevin11 GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load Kevin11 content.' }, { status: 500 })
  }
}
