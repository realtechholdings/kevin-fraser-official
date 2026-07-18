import type { Metadata } from 'next'
import WorldPage from '@/components/WorldPage'

export const metadata: Metadata = {
  title: 'The Studio | Kevin Fraser Official',
  description: 'Behind the scenes, creative process, and characters from Kevin Fraser.',
}

export default function StudioPage() {
  return (
    <WorldPage
      emoji="🎬"
      title="The Studio"
      subtitle="Behind The Scenes · Creative Process · Characters"
      color="#FF0080"
      neonClass="neon-text-magenta"
      worldGuide="Gladys"
      description="Deep inside the creative machine. Behind-the-scenes access, the creative process laid bare, and the characters that make up Kevin's world."
      ctaLabel="STEP INSIDE"
      ctaHref="/"
      comingSoonItems={[
        'Behind-the-scenes footage',
        'Creative process deep-dives',
        'Character profiles',
        'Mood boards & references',
        'Gladys-guided tours',
      ]}
    />
  )
}
