'use client'

import { useEffect } from 'react'
import { hexToRgba, type ThemeSettings } from '@/lib/settings/defaults'

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

        const t = data.theme
        styleEl = document.createElement('style')
        styleEl.setAttribute('data-kf-theme-settings', 'true')
        styleEl.textContent = `
:root, html.light {
  --accent: ${t.lightAccent};
  --accent-soft: ${hexToRgba(t.lightAccent, 0.12)};
  --accent-contrast: ${t.lightAccentContrast};
  --neon-orange: ${t.lightAccent};
}
html.dark {
  --accent: ${t.darkAccent};
  --accent-soft: ${hexToRgba(t.darkAccent, 0.15)};
  --accent-contrast: ${t.darkAccentContrast};
  --neon-orange: ${t.darkAccent};
}
`
        document.head.appendChild(styleEl)
      } catch {
        // keep CSS defaults
      }
    })()

    return () => {
      cancelled = true
      styleEl?.remove()
    }
  }, [])

  return null
}
