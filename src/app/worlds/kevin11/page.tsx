import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'Kevin11 | Kevin Fraser Official',
  description: 'Sports, footy, and community with Kevin Fraser.',
}

export default function Kevin11Page() {
  return (
    <WorldPage
      emoji="🔴"
      title="Kevin11"
      subtitle="Sports · Footy · Community"
      color="#FF2D55"
      neonClass="neon-text-red"
      description="The sporting soul of Kevin Fraser. AFL footy passion, community building, sporting commentary, and the competitive spirit that drives everything he does."
      comingSoonItems={[
        'Match analysis and commentary',
        'Community challenges',
        'Sporting event coverage',
        'Fan community hub',
        'Kevin11 merchandise',
      ]}
    />
  )
}
