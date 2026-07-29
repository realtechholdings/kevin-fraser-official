import type { Metadata } from 'next'
import Kevin11VideoPage from '@/components/kevin11/Kevin11VideoPage'

export const metadata: Metadata = {
  title: 'Kevin11 | Kevin Fraser Official',
  description: 'Watch Kevin11 — full screen from Kevin Fraser Official.',
}

export default function Kevin11Page() {
  return <Kevin11VideoPage />
}
