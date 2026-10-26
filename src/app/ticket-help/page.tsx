import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDocument from '@/components/legal/LegalDocument'
import LegalMarkdown from '@/components/legal/LegalMarkdown'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ticket Help | Kevin Fraser Official',
  description:
    'Answers about Kevin Fraser show tickets: refunds, transfers, age limits, seating, doors times, and accessibility.',
}

export default async function TicketHelpPage() {
  const settings = await getSiteSettings()
  const doc = settings.legal.ticketHelp

  return (
    <LegalDocument title={doc.title} subtitle={doc.subtitle}>
      <LegalMarkdown body={doc.body} />
      <p>
        To move tickets to another show on the same tour, use the link in your ticket email or open the{' '}
        <Link href="/worlds/stage/transfer" className="underline">
          ticket transfer page
        </Link>
        . If the new tickets cost more, you pay the difference. The replacement seats are held while that payment is completed.
      </p>
    </LegalDocument>
  )
}
