import type { Metadata } from 'next'
import LegalDocument from '@/components/legal/LegalDocument'
import LegalMarkdown from '@/components/legal/LegalMarkdown'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Statement | Kevin Fraser Official',
  description: 'Privacy Statement for Kevin Fraser Official.',
}

export default async function PrivacyPage() {
  const settings = await getSiteSettings()
  const doc = settings.legal.privacy

  return (
    <LegalDocument title={doc.title} subtitle={doc.subtitle}>
      <LegalMarkdown body={doc.body} />
    </LegalDocument>
  )
}
