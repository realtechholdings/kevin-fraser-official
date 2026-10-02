import { showEventJsonLdScript } from '@/lib/shows/eventSchema'
import type { PublicShow } from '@/lib/serialize'

export default function EventJsonLd({ show }: { show: PublicShow }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: showEventJsonLdScript(show) }}
    />
  )
}
