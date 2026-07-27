import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import BonusContent from '@/lib/models/BonusContent'
import { fetchYouTubeShowreel } from '@/lib/showreel/feeds'
import { serializeBonusContent } from '@/lib/serialize'
import { bonusFilePath, publicUrlForKey } from '@/lib/r2'
import type { ShowreelItem } from '@/lib/showreel/feeds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const errors: Record<string, string> = {}

  const [youtube, bonusResult] = await Promise.allSettled([
    fetchYouTubeShowreel(),
    (async () => {
      await dbConnect()
      return BonusContent.find({ published: true }).sort({ sortOrder: 1, createdAt: -1 })
    })(),
  ])

  const yt = youtube.status === 'fulfilled' ? youtube.value : []
  if (youtube.status === 'rejected') {
    errors.reels = youtube.reason instanceof Error ? youtube.reason.message : 'YouTube failed'
  }

  let bonusItems: ShowreelItem[] = []
  if (bonusResult.status === 'fulfilled') {
    bonusItems = bonusResult.value.map((item) => {
      const serialized = serializeBonusContent(item)
      const mediaPublic = publicUrlForKey(serialized.mediaKey)
      const thumbPublic = serialized.thumbnailKey ? publicUrlForKey(serialized.thumbnailKey) : ''
      return {
        id: serialized.id,
        source: 'bonus' as const,
        title: serialized.title,
        url: mediaPublic || bonusFilePath(serialized.id, 'media'),
        thumbnail: thumbPublic || (serialized.thumbnailKey ? bonusFilePath(serialized.id, 'thumbnail') : ''),
        publishedAt: serialized.createdAt,
        kind: 'bonus' as const,
        description: serialized.description,
        mimeType: serialized.mimeType,
        views: null,
      }
    })
  } else {
    errors.bonus =
      bonusResult.reason instanceof Error ? bonusResult.reason.message : 'Bonus content failed'
  }

  return NextResponse.json({
    success: true,
    sources: {
      reels: {
        profile: 'https://www.youtube.com/channel/UCC6E2S7huJK1jwnaTpqJuPg',
        items: yt,
      },
      bonus: {
        items: bonusItems,
      },
    },
    errors: Object.keys(errors).length ? errors : undefined,
  })
}
