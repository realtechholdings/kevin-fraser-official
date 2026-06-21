import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Studio | Kevin Fraser Official',
  description: 'Music, production, and creative work from Kevin Fraser.',
}

export default function StudioPage() {
  return (
    <WorldPage
      emoji="🎵"
      title="The Studio"
      subtitle="Music · Production · Creative"
      color="#7B2FF7"
      neonClass="neon-text-purple"
      description="The creative core. Original music, production work, and sonic experiments from Kevin Fraser. Where ideas become sound."
      comingSoonItems={[
        'Original music releases',
        'Production portfolio',
        'Spotify / Apple Music links',
        'Studio sessions content',
        'Collaboration opportunities',
      ]}
    />
  )
}
