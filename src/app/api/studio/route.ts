import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import StudioContent, {
  STUDIO_CATEGORIES,
  type StudioCategory,
} from '@/lib/models/StudioContent'
import { serializeStudioContent } from '@/lib/serialize'
import { publicUrlForKey, studioFilePath } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await dbConnect()
    const docs = await StudioContent.find({ published: true }).sort({
      category: 1,
      sortOrder: 1,
      createdAt: -1,
    })

    const items = docs.map((doc) => {
      const serialized = serializeStudioContent(doc)
      const mediaPublic = publicUrlForKey(serialized.mediaKey)
      const thumbPublic = serialized.thumbnailKey ? publicUrlForKey(serialized.thumbnailKey) : ''
      return {
        ...serialized,
        mediaUrl: mediaPublic || studioFilePath(serialized.id, 'media'),
        thumbnailUrl:
          thumbPublic ||
          (serialized.thumbnailKey ? studioFilePath(serialized.id, 'thumbnail') : ''),
      }
    })

    const byCategory = STUDIO_CATEGORIES.reduce(
      (acc, category) => {
        acc[category] = items.filter((item) => item.category === category)
        return acc
      },
      {} as Record<StudioCategory, typeof items>,
    )

    return NextResponse.json({
      success: true,
      categories: STUDIO_CATEGORIES,
      items,
      byCategory,
    })
  } catch (error) {
    console.error('Studio GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load studio content.' }, { status: 500 })
  }
}
