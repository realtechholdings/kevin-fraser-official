import type { Metadata } from 'next'
import ShowreelPageClient from '@/components/showreel/ShowreelPageClient'

export const metadata: Metadata = {
  title: 'The Showreel | Kevin Fraser Official',
  description:
    'Watch Kevin Fraser YouTube reels and exclusive bonus content from the official showreel.',
}

export default function ShowreelPage() {
  return <ShowreelPageClient />
}
