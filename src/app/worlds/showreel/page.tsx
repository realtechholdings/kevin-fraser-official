import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Showreel | Kevin Fraser Official',
  description: 'Stand-up, reels, and bonus content from Kevin Fraser.',
}

export default function ShowreelPage() {
  return (
    <WorldPage
      emoji="🎬"
      title="The Showreel"
      subtitle="Stand-Up · Reels · Bonus Content"
      color="#7ECFFF"
      neonClass="neon-text-blue"
      description="Kevin's visual universe. Stand-up sets, short-form reels, and raw bonus content. Watch the world through Kevin's lens."
      comingSoonItems={[
        'Stand-up clips',
        'Short-form content feed',
        'Bonus behind-the-scenes',
        'Live performance footage',
        'Exclusive content drops',
      ]}
    />
  )
}
