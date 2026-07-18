import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Stage | Kevin Fraser Official',
  description: 'Shows, tickets, and upcoming dates for Kevin Fraser.',
}

export default function StagePage() {
  return (
    <WorldPage
      emoji="🎭"
      title="The Stage"
      subtitle="Shows · Tickets · Upcoming Dates"
      color="#FF6B35"
      neonClass="neon-text-orange"
      description="Where Kevin comes alive. Live performances, headline tours, and unforgettable events. This is where the magic happens in real life."
      ctaLabel="VIEW TOURS"
      ctaHref="/"
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
