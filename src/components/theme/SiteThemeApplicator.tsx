'use client'

import { useEffect } from 'react'
import type { ThemeSettings } from '@/lib/settings/defaults'
import { themeToCss } from '@/lib/settings/themeCss'

type PublicSettings = {
  theme?: ThemeSettings
}

export default function SiteThemeApplicator() {
  useEffect(() => {
    let cancelled = false
    let styleEl: HTMLStyleElement | null = null

    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        const data = (await res.json()) as PublicSettings & { success?: boolean }
        if (!res.ok || !data.success || !data.theme || cancelled) return

        styleEl = document.createElement('style')
        styleEl.setAttribute('data-kf-theme-settings', 'true')
        styleEl.textContent = themeToCss(data.theme)
        document.head.appendChild(styleEl)
      } catch {
        // keep SSR / CSS defaults
      }
    })()

    return () => {
      cancelled = true
      styleEl?.remove()
    }
  }, [])

  return null
}
