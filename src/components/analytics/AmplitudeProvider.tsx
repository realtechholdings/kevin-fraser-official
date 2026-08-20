'use client'

import { useEffect } from 'react'

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY?.trim() || ''

/**
 * Bootstraps Amplitude analytics + session replay on the client.
 *
 * Mirrors the StakeSight / Lattice unified SDK setup: autocapture
 * (page views, sessions, element interactions, web vitals, frustration)
 * and full session replay.
 */
export default function AmplitudeProvider() {
  useEffect(() => {
    if (!AMPLITUDE_API_KEY) return

    let cancelled = false
    import('@amplitude/unified')
      .then((amplitude) => {
        if (cancelled) return
        try {
          amplitude.initAll(AMPLITUDE_API_KEY, {
            analytics: {
              autocapture: {
                attribution: true,
                fileDownloads: true,
                formInteractions: true,
                pageViews: true,
                sessions: true,
                elementInteractions: true,
                networkTracking: true,
                webVitals: true,
                frustrationInteractions: {
                  thrashedCursor: true,
                  errorClicks: true,
                  deadClicks: true,
                  rageClicks: true,
                },
              },
            },
            sessionReplay: { sampleRate: 1 },
          })
        } catch (err) {
          console.warn('[amplitude] init failed', err)
        }
      })
      .catch((err) => {
        console.warn('[amplitude] load failed', err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
