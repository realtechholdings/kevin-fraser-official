export type ShowreelItem = {
  id: string
  source: 'youtube' | 'bonus'
  title: string
  url: string
  thumbnail: string
  publishedAt: string | null
  kind: 'short' | 'video' | 'bonus'
  views?: number | null
  description?: string
  mimeType?: string
}

const YT_CHANNEL_ID = 'UCC6E2S7huJK1jwnaTpqJuPg'
const YT_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1].trim() : ''
}

function attr(xml: string, tagName: string, attrName: string) {
  const m = xml.match(new RegExp(`<${tagName}[^>]*${attrName}="([^"]+)"[^>]*/?>`, 'i'))
  return m ? m[1] : ''
}

export async function fetchYouTubeShowreel(): Promise<ShowreelItem[]> {
  const res = await fetch(YT_FEED, {
    next: { revalidate: 600 },
    headers: { Accept: 'application/atom+xml,application/xml,text/xml' },
  })
  if (!res.ok) throw new Error(`YouTube feed failed (${res.status})`)
  const xml = await res.text()
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []

  return entries.map((entry) => {
    const videoId = tag(entry, 'yt:videoId')
    const title = tag(entry, 'title')
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .trim()
    const link = attr(entry, 'link', 'href') || `https://www.youtube.com/watch?v=${videoId}`
    const isShort = /\/shorts\//i.test(link)
    const thumbnail =
      attr(entry, 'media:thumbnail', 'url') ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    const viewsRaw = attr(entry, 'media:statistics', 'views')
    return {
      id: `yt-${videoId}`,
      source: 'youtube' as const,
      title: title || 'YouTube video',
      url: link,
      thumbnail,
      publishedAt: tag(entry, 'published') || null,
      kind: isShort ? ('short' as const) : ('video' as const),
      views: viewsRaw ? Number(viewsRaw) : null,
    }
  })
}
