import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'Kevin11 — The Inconvenience Store | Kevin Fraser Official',
  description: 'Comedy, merch, and random goodies from Kevin Fraser.',
}

export default function Kevin11Page() {
  return (
    <WorldPage
      emoji="🏪"
      title="Kevin11"
      subtitle="Comedy · Merch · Random Goodies"
      color="#FFD700"
      neonClass="neon-text-yellow"
      worldGuide="Thembi"
      worldGuideDesc="The till operator who has seen everything and is not impressed."
      description="The Inconvenience Store. Comedy, merch and random goodies — served up late-night corner store style. Thembi's at the till. She's not impressed."
      ctaLabel="ENTER STORE"
      ctaHref="/"
      comingSoonItems={[
        'Stand-up specials',
        'Merch drops',
        'Random goodies',
        'Comedy clips',
        'Kevin11 exclusives',
      ]}
    />
  )
}
