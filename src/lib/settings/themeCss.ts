import {
  DEFAULT_THEME_SETTINGS,
  hexToRgba,
  type ThemeSettings,
} from '@/lib/settings/defaults'

export function themeToCss(t: ThemeSettings) {
  const soldBg = t.soldOutBg || DEFAULT_THEME_SETTINGS.soldOutBg
  const soldFg = t.soldOutFg || DEFAULT_THEME_SETTINGS.soldOutFg
  return `
:root, html.light {
  --accent: ${t.lightAccent};
  --accent-soft: ${hexToRgba(t.lightAccent, 0.12)};
  --accent-contrast: ${t.lightAccentContrast};
  --neon-orange: ${t.lightAccent};
  --sold-out-bg: ${soldBg};
  --sold-out-fg: ${soldFg};
}
html.dark {
  --accent: ${t.darkAccent};
  --accent-soft: ${hexToRgba(t.darkAccent, 0.15)};
  --accent-contrast: ${t.darkAccentContrast};
  --neon-orange: ${t.darkAccent};
  --sold-out-bg: ${soldBg};
  --sold-out-fg: ${soldFg};
}
`.trim()
}
