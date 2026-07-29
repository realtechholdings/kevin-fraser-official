import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import LegalMarkdown from '@/components/legal/LegalMarkdown'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Refund Policy | Kevin Fraser Official',
  description: 'Refund and returns policy for Kevin Fraser Official.',
}

export default async function RefundPolicyPage() {
  const settings = await getSiteSettings()
  const doc = settings.legal.refundPolicy

  return (
    <LegalDocument title={doc.title} subtitle={doc.subtitle}>
      <LegalMarkdown body={doc.body} />
    </LegalDocument>
  )
}
