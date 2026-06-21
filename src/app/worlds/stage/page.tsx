import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Stage | Kevin Fraser Official',
  description: 'Live events, tours, and ticket links for Kevin Fraser.',
}

export default function StagePage() {
  return (
    <WorldPage
      emoji="🎭"
      title="The Stage"
      subtitle="Live Events · Tours · Tickets"
      color="#FF6B35"
      neonClass="neon-text-orange"
      description="Where Kevin comes alive. Live performances, headline tours, and unforgettable events. This is where the magic happens in real life."
      comingSoonItems={[
        'Upcoming tour dates',
        'Ticket purchase links',
        'Event gallery',
        'Behind-the-scenes content',
        'VIP experience packages',
      ]}
    />
  )
}
