import type { Metadata } from 'next'
import ShowreelPageClient from '@/components/showreel/ShowreelPageClient'

export const metadata: Metadata = {
  title: 'The Showreel | Kevin Fraser Official',
  description:
    'Watch Kevin Fraser shorts, reels, and clips from YouTube, Instagram, and Facebook.',
}

export default function ShowreelPage() {
  return <ShowreelPageClient />
}
