import type { Metadata } from 'next'
import BrandPartnershipsClient from '@/components/bookings/BrandPartnershipsClient'

export const metadata: Metadata = {
  title: 'Brands & partnerships | Kevin Fraser Official',
  description:
    'Partner with Kevin Fraser. Sponsored content, ambassador deals, product placement, activations, and collabs — send the brief, channels, timeline, and budget.',
}

export default function BrandPartnershipsPage() {
  return <BrandPartnershipsClient />
}
