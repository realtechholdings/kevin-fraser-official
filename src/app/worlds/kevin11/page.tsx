import type { Metadata } from 'next'
import Kevin11PageClient from '@/components/kevin11/Kevin11PageClient'

export const metadata: Metadata = {
  title: 'Kevin11 | Kevin Fraser Official',
  description: 'Kevin11 inconvenience store — comedy, merch, and more from Kevin Fraser Official.',
}

export default function Kevin11Page() {
  return <Kevin11PageClient />
}
