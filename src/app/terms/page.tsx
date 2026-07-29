import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import LegalMarkdown from '@/components/legal/LegalMarkdown'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service | Kevin Fraser Official',
  description: 'Terms of Service for Kevin Fraser Official.',
}

export default async function TermsPage() {
  const settings = await getSiteSettings()
  const doc = settings.legal.terms

  return (
    <LegalDocument title={doc.title} subtitle={doc.subtitle}>
      <LegalMarkdown body={doc.body} />
    </LegalDocument>
  )
}
