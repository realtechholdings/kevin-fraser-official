export type ShowreelItem = {
  id: string
  source: 'youtube' | 'instagram' | 'facebook'
  title: string
  url: string
  thumbnail: string
  publishedAt: string | null
  kind: 'short' | 'video' | 'reel' | 'post'
  views?: number | null
}

const YT_CHANNEL_ID = 'UCC6E2S7huJK1jwnaTpqJuPg'
const YT_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`
const IG_USERNAME = 'kevinfraserofficial'
const IG_APP_ID = '936619743392459'
const FB_PAGE_URL = 'https://www.facebook.com/kevinfraserofficial/'

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const IG_HEADERS: HeadersInit = {
  'User-Agent': BROWSER_UA,
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-ig-app-id': IG_APP_ID,
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  Referer: `https://www.instagram.com/${IG_USERNAME}/`,
  Origin: 'https://www.instagram.com',
}

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1].trim() : ''
}

function attr(xml: string, tagName: string, attrName: string) {
  const m = xml.match(new RegExp(`<${tagName}[^>]*${attrName}="([^"]+)"[^>]*/?>`, 'i'))
  return m ? m[1] : ''
}

function captionFromNode(node: {
  edge_media_to_caption?: { edges?: { node?: { text?: string } }[] }
  title?: string | null
}): string {
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim()
  if (caption) return caption.split('\n')[0]!.slice(0, 120)
  if (node.title?.trim()) return node.title.trim().slice(0, 120)
  return ''
}

type IgMediaNode = {
  id?: string
  shortcode?: string
  is_video?: boolean
  __typename?: string
  product_type?: string | null
  title?: string | null
  display_url?: string
  thumbnail_src?: string
  taken_at_timestamp?: number
  video_view_count?: number | null
  edge_media_to_caption?: { edges?: { node?: { text?: string } }[] }
}

function igNodeToItem(node: IgMediaNode): ShowreelItem | null {
  const code = node.shortcode
  if (!code) return null

  const isVideo =
    Boolean(node.is_video) ||
    node.__typename === 'GraphVideo' ||
    node.product_type === 'clips' ||
    node.product_type === 'reels' ||
    node.product_type === 'igtv'

  const isReel =
    node.product_type === 'clips' ||
    node.product_type === 'reels' ||
    (isVideo && node.product_type !== 'igtv')

  const title = captionFromNode(node) || (isReel ? 'Instagram Reel' : isVideo ? 'Instagram Video' : 'Instagram Post')

  return {
    id: `ig-${code}`,
    source: 'instagram',
    title,
    url: isVideo
      ? `https://www.instagram.com/reel/${code}/`
      : `https://www.instagram.com/p/${code}/`,
    thumbnail: node.thumbnail_src || node.display_url || '',
    publishedAt: node.taken_at_timestamp
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : null,
    kind: isReel ? 'reel' : isVideo ? 'video' : 'post',
    views: typeof node.video_view_count === 'number' ? node.video_view_count : null,
  }
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

async function fetchInstagramViaWebApi(): Promise<ShowreelItem[]> {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${IG_USERNAME}`,
    {
      next: { revalidate: 600 },
      headers: IG_HEADERS,
    },
  )
  if (!res.ok) throw new Error(`Instagram profile API failed (${res.status})`)

  const data = (await res.json()) as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: { edges?: { node?: IgMediaNode }[] }
        edge_felix_video_timeline?: { edges?: { node?: IgMediaNode }[] }
      }
    }
  }

  const user = data.data?.user
  if (!user) throw new Error('Instagram profile API returned no user')

  const timeline = (user.edge_owner_to_timeline_media?.edges || [])
    .map((e) => e.node)
    .filter(Boolean) as IgMediaNode[]
  const felix = (user.edge_felix_video_timeline?.edges || [])
    .map((e) => e.node)
    .filter(Boolean) as IgMediaNode[]

  // Prefer Reels (clips) from the feed; fill with other timeline + older IGTV.
  const preferred = timeline.filter(
    (n) => n.product_type === 'clips' || n.product_type === 'reels',
  )
  const rest = [
    ...timeline.filter((n) => n.product_type !== 'clips' && n.product_type !== 'reels'),
    ...felix,
  ]

  const items: ShowreelItem[] = []
  const seen = new Set<string>()
  for (const node of [...preferred, ...rest]) {
    const item = igNodeToItem(node)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    items.push(item)
  }

  if (!items.length) throw new Error('Instagram profile API returned no media')
  // Showreel surface: video/reels first; drop still posts unless nothing else exists.
  const videoItems = items.filter((i) => i.kind === 'reel' || i.kind === 'video')
  return videoItems.length ? videoItems : items
}

async function fetchInstagramViaEmbedFallback(): Promise<ShowreelItem[]> {
  const res = await fetch(`https://www.instagram.com/${IG_USERNAME}/embed/`, {
    next: { revalidate: 600 },
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Instagram embed failed (${res.status})`)
  const html = (await res.text()).replace(/\\"/g, '"').replace(/\\\//g, '/')

  const codes = Array.from(
    new Set(
      [
        ...(html.match(/"shortcode":"([A-Za-z0-9_-]+)"/g) || []).map((m) =>
          m.replace(/"shortcode":"|"/g, ''),
        ),
        ...(html.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/g) || []).map(
          (m) => m.split('/').pop()!,
        ),
      ].filter(Boolean),
    ),
  )

  return codes.slice(0, 24).map((code) => ({
    id: `ig-${code}`,
    source: 'instagram' as const,
    title: 'Instagram Reel',
    url: `https://www.instagram.com/reel/${code}/`,
    thumbnail: '',
    publishedAt: null,
    kind: 'reel' as const,
    views: null,
  }))
}

export async function fetchInstagramShowreel(): Promise<ShowreelItem[]> {
  try {
    return await fetchInstagramViaWebApi()
  } catch {
    const fallback = await fetchInstagramViaEmbedFallback()
    if (!fallback.length) throw new Error('Instagram feed unavailable')
    return fallback
  }
}

export async function fetchFacebookShowreel(): Promise<ShowreelItem[]> {
  // Facebook does not expose a stable public media feed without Graph API tokens.
  // The Showreel UI embeds the official Page Plugin for the live timeline instead.
  return [
    {
      id: 'fb-page',
      source: 'facebook',
      title: 'Kevin Fraser on Facebook',
      url: FB_PAGE_URL,
      thumbnail: '',
      publishedAt: null,
      kind: 'post',
      views: null,
    },
  ]
}
