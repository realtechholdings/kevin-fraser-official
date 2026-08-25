'use client'

import { useEffect, useState } from 'react'
import type { ThemeSettings } from '@/lib/settings/defaults'
import { DEFAULT_THEME_SETTINGS, hexToRgba } from '@/lib/settings/defaults'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

export default function ThemeAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load theme')
      setTheme({
        ...DEFAULT_THEME_SETTINGS,
        ...(data.settings?.theme || {}),
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load theme')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setTheme(data.settings.theme)
      onMessage('Theme saved. Public pages will pick it up on refresh.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function resetDefaults() {
    setTheme({ ...DEFAULT_THEME_SETTINGS })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Theme</h2>
          <p className="mt-1 text-sm text-white/40">
            Accent colours for light/dark mode, plus Sold Out button colours on Stage.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={resetDefaults} className={btnSecondary}>
            Reset defaults
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save theme'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card space-y-4 p-5">
          <h3 className="text-sm font-semibold text-white">Light mode</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Accent</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                  value={theme.lightAccent}
                  onChange={(e) => setTheme((t) => ({ ...t, lightAccent: e.target.value }))}
                />
                <input
                  className={inputClass}
                  value={theme.lightAccent}
                  onChange={(e) => setTheme((t) => ({ ...t, lightAccent: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Accent contrast (text on accent)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                  value={theme.lightAccentContrast}
                  onChange={(e) => setTheme((t) => ({ ...t, lightAccentContrast: e.target.value }))}
                />
                <input
                  className={inputClass}
                  value={theme.lightAccentContrast}
                  onChange={(e) => setTheme((t) => ({ ...t, lightAccentContrast: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background: theme.lightAccent,
              color: theme.lightAccentContrast,
              boxShadow: `0 0 0 6px ${hexToRgba(theme.lightAccent, 0.18)}`,
            }}
          >
            Preview button
          </div>
        </section>

        <section className="admin-card space-y-4 p-5">
          <h3 className="text-sm font-semibold text-white">Dark mode</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Accent</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                  value={theme.darkAccent}
                  onChange={(e) => setTheme((t) => ({ ...t, darkAccent: e.target.value }))}
                />
                <input
                  className={inputClass}
                  value={theme.darkAccent}
                  onChange={(e) => setTheme((t) => ({ ...t, darkAccent: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Accent contrast (text on accent)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                  value={theme.darkAccentContrast}
                  onChange={(e) => setTheme((t) => ({ ...t, darkAccentContrast: e.target.value }))}
                />
                <input
                  className={inputClass}
                  value={theme.darkAccentContrast}
                  onChange={(e) => setTheme((t) => ({ ...t, darkAccentContrast: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background: theme.darkAccent,
              color: theme.darkAccentContrast,
              boxShadow: `0 0 0 6px ${hexToRgba(theme.darkAccent, 0.2)}`,
            }}
          >
            Preview button
          </div>
        </section>
      </div>

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Sold Out buttons</h3>
        <p className="text-xs text-white/40">
          Colour for the right-hand Sold Out button on Stage and on show pages (light and dark).
          Save theme, then refresh the public Stage page to confirm.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Background</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                value={theme.soldOutBg || DEFAULT_THEME_SETTINGS.soldOutBg}
                onChange={(e) => setTheme((t) => ({ ...t, soldOutBg: e.target.value }))}
              />
              <input
                className={inputClass}
                value={theme.soldOutBg || DEFAULT_THEME_SETTINGS.soldOutBg}
                onChange={(e) => setTheme((t) => ({ ...t, soldOutBg: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Text</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                value={theme.soldOutFg || DEFAULT_THEME_SETTINGS.soldOutFg}
                onChange={(e) => setTheme((t) => ({ ...t, soldOutFg: e.target.value }))}
              />
              <input
                className={inputClass}
                value={theme.soldOutFg || DEFAULT_THEME_SETTINGS.soldOutFg}
                onChange={(e) => setTheme((t) => ({ ...t, soldOutFg: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div
          className="inline-flex rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{
            background: theme.soldOutBg || DEFAULT_THEME_SETTINGS.soldOutBg,
            color: theme.soldOutFg || DEFAULT_THEME_SETTINGS.soldOutFg,
          }}
        >
          Sold Out
        </div>
      </section>
    </form>
  )
}
