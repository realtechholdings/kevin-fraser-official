import type { Metadata } from 'next'
import AboutPageClient from '@/components/about/AboutPageClient'

export const metadata: Metadata = {
  title: 'About | Kevin Fraser Official',
  description:
    'Kevin Fraser is a South African comedian, content creator, and professional observer of human behaviour.',
}

export default function AboutPage() {
  return <AboutPageClient />
}
