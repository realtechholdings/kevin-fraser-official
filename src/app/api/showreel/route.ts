import { NextResponse } from 'next/server'
import {
  fetchFacebookShowreel,
  fetchInstagramShowreel,
  fetchYouTubeShowreel,
} from '@/lib/showreel/feeds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [youtube, instagram, facebook] = await Promise.allSettled([
    fetchYouTubeShowreel(),
    fetchInstagramShowreel(),
    fetchFacebookShowreel(),
  ])

  const errors: Record<string, string> = {}

  const yt = youtube.status === 'fulfilled' ? youtube.value : []
  if (youtube.status === 'rejected') {
    errors.youtube = youtube.reason instanceof Error ? youtube.reason.message : 'YouTube failed'
  }

  const ig = instagram.status === 'fulfilled' ? instagram.value : []
  if (instagram.status === 'rejected') {
    errors.instagram =
      instagram.reason instanceof Error ? instagram.reason.message : 'Instagram failed'
  }

  const fb = facebook.status === 'fulfilled' ? facebook.value : []
  if (facebook.status === 'rejected') {
    errors.facebook =
      facebook.reason instanceof Error ? facebook.reason.message : 'Facebook failed'
  }

  return NextResponse.json({
    success: true,
    sources: {
      youtube: {
        profile: 'https://www.youtube.com/channel/UCC6E2S7huJK1jwnaTpqJuPg',
        items: yt,
      },
      instagram: {
        profile: 'https://www.instagram.com/kevinfraserofficial/',
        items: ig,
      },
      facebook: {
        profile: 'https://www.facebook.com/kevinfraserofficial/',
        items: fb,
      },
    },
    errors: Object.keys(errors).length ? errors : undefined,
  })
}
