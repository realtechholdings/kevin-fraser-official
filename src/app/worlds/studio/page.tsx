import type { Metadata } from 'next'
import StudioPageClient from '@/components/studio/StudioPageClient'

export const metadata: Metadata = {
  title: 'The Studio | Kevin Fraser Official',
  description:
    'Behind the scenes, characters, and creative process videos from Kevin Fraser.',
}

export default function StudioPage() {
  return <StudioPageClient />
}
