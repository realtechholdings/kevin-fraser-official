import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Showreel | Kevin Fraser Official',
  description: 'Video content, reels, and media from Kevin Fraser.',
}

export default function ShowreelPage() {
  return (
    <WorldPage
      emoji="🎬"
      title="The Showreel"
      subtitle="Video · Reels · Media"
      color="#00D4FF"
      neonClass="neon-text-blue"
      description="Kevin's visual universe. Campaign videos, short-form reels, commercial work, and raw creative content. Watch the world through Kevin's lens."
      comingSoonItems={[
        'Curated video reel',
        'Short-form content feed',
        'Brand partnership videos',
        'Behind-the-scenes clips',
        'Podcast appearances',
      ]}
    />
  )
}
