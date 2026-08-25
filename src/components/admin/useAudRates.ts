'use client'

import { useEffect, useState } from 'react'
import type { AudRates } from '@/lib/fx'

let inflight: Promise<AudRates | null> | null = null
let cached: AudRates | null = null

async function loadAudRates(): Promise<AudRates | null> {
  if (cached) return cached
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/admin/fx')
        const data = await res.json()
        if (!res.ok || !data.rates) return null
        cached = data.rates as AudRates
        return cached
      } catch {
        return null
      } finally {
        inflight = null
      }
    })()
  }
  return inflight
}

export function useAudRates() {
  const [rates, setRates] = useState<AudRates | null>(cached)

  useEffect(() => {
    let cancelled = false
    void loadAudRates().then((next) => {
      if (!cancelled && next) setRates(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return rates
}
