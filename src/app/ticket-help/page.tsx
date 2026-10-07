import type { Metadata } from 'next'
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
    </LegalDocument>
  )
}
