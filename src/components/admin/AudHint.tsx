'use client'

import { formatAudEquivalent } from '@/lib/fx'
import { useAudRates } from '@/components/admin/useAudRates'

export default function AudHint({
  cents,
  currency,
  className = 'mt-1.5 text-xs text-white/35',
}: {
  cents: number | string
  currency: string
  className?: string
}) {
  const rates = useAudRates()
  const amount = typeof cents === 'string' ? Number(cents) : cents
  const label = formatAudEquivalent(amount, currency, rates)
  if (!label) return null
  return (
    <p className={className} title={rates?.asOf ? `Mid-market as of ${rates.asOf}` : 'Indicative mid-market rate'}>
      {label} <span className="text-white/25">AUD base</span>
    </p>
  )
}
