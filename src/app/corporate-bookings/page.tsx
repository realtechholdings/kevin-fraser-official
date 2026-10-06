import type { Metadata } from 'next'
import CorporateBookingsClient from '@/components/bookings/CorporateBookingsClient'

export const metadata: Metadata = {
  title: 'Corporate bookings | Kevin Fraser Official',
  description:
    'Book Kevin Fraser for a company event. Send the date, city, audience size, budget, and event type.',
}

export default function CorporateBookingsPage() {
  return <CorporateBookingsClient />
}
