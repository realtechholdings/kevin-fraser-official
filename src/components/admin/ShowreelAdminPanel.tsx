'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_SHOWREEL_SETTINGS,
  type ShowreelImageSlot,
  type ShowreelSettings,
} from '@/lib/settings/defaults'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

const FOCUS_POSITIONS = [
  { value: 'center center', label: 'Centre' },
  { value: 'center top', label: 'Top' },
  { value: 'center bottom', label: 'Bottom' },
  { value: 'left center', label: 'Left' },
  { value: 'right center', label: 'Right' },
  { value: 'left top', label: 'Top left' },
  { value: 'right top', label: 'Top right' },
  { value: 'left bottom', label: 'Bottom left' },
  { value: 'right bottom', label: 'Bottom right' },
] as const

const SLOTS: {
  key: keyof ShowreelSettings
  title: string
  hint: string
}[] = [
  {
    key: 'pageHero',
    title: 'Page hero',
    hint: 'Behind “The Showreel” heading. Ideal ~2400×1000 (2.4:1).',
  },
  {
    key: 'reelsBanner',
    title: 'Reels tab banner',
    hint: 'Shown under the tabs when Reels is selected. Ideal ~2400×800 (3:1).',
  },
  {
    key: 'bonusBanner',
    title: 'Bonus tab banner',
    hint: 'Shown under the tabs when Bonus Content is selected. Ideal ~2400×800 (3:1).',
  },
]

async function uploadShowreelImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', 'showreel')
  const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Image upload failed')
  if (!data.key) throw new Error('Upload did not return a storage key.')
  return {
    key: data.key as string,
    publicUrl: (data.publicUrl as string) || '',
  }
}

function emptySlot(): ShowreelImageSlot {
  return { imageKey: '', imageUrl: '', focus: 'center center' }
}

export default function ShowreelAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [showreel, setShowreel] = useState<ShowreelSettings>(DEFAULT_SHOWREEL_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load showreel settings')
      setShowreel(data.settings?.showreel || DEFAULT_SHOWREEL_SETTINGS)
      setR2Configured(data.r2Configured !== false)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load showreel settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patchSlot(key: keyof ShowreelSettings, patch: Partial<ShowreelImageSlot>) {
    setShowreel((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || emptySlot()), ...patch },
    }))
  }

  async function onFileChange(key: keyof ShowreelSettings, file: File | null) {
    if (!file) return
    setBusy(true)
    onError('')
    try {
      const uploaded = await uploadShowreelImage(file)
      const preview = uploaded.publicUrl || URL.createObjectURL(file)
      patchSlot(key, {
        imageKey: uploaded.key,
        imageUrl: preview || `/api/settings/showreel/${key}`,
      })
      onMessage('Image uploaded — click Save banners to publish.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const payload: ShowreelSettings = {
        pageHero: {
          ...showreel.pageHero,
          imageUrl: showreel.pageHero.imageUrl.startsWith('blob:')
            ? showreel.pageHero.imageKey
              ? `/api/settings/showreel/pageHero`
              : ''
            : showreel.pageHero.imageUrl,
        },
        reelsBanner: {
          ...showreel.reelsBanner,
          imageUrl: showreel.reelsBanner.imageUrl.startsWith('blob:')
            ? showreel.reelsBanner.imageKey
              ? `/api/settings/showreel/reelsBanner`
              : ''
            : showreel.reelsBanner.imageUrl,
        },
        bonusBanner: {
          ...showreel.bonusBanner,
          imageUrl: showreel.bonusBanner.imageUrl.startsWith('blob:')
            ? showreel.bonusBanner.imageKey
              ? `/api/settings/showreel/bonusBanner`
              : ''
            : showreel.bonusBanner.imageUrl,
        },
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showreel: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setShowreel(data.settings.showreel)
      onMessage('Showreel banners saved.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Showreel banners</h2>
          <p className="mt-1 text-sm text-white/40">
            Customise the page hero and the banner above each tab independently.
          </p>
        </div>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : 'Save banners'}
        </button>
      </div>

      {!r2Configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Cloudflare R2 is not configured — image uploads will fail until it is.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {SLOTS.map((slot) => {
          const value = showreel[slot.key] || emptySlot()
          const preview =
            value.imageUrl ||
            (value.imageKey ? `/api/settings/showreel/${slot.key}` : '')
          return (
            <section key={slot.key} className="admin-card space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold text-white">{slot.title}</h3>
                <p className="mt-1 text-xs text-white/35">{slot.hint}</p>
              </div>

              {preview ? (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className="aspect-[2.4/1] w-full object-cover"
                    style={{ objectPosition: value.focus || 'center center' }}
                  />
                </div>
              ) : (
                <div className="flex aspect-[2.4/1] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-white/30">
                  No image
                </div>
              )}

              <div>
                <label className={labelClass}>Upload image</label>
                <input
                  className={inputClass}
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => void onFileChange(slot.key, e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className={labelClass}>Crop / focus</label>
                <select
                  className={inputClass}
                  value={value.focus || 'center center'}
                  onChange={(e) => patchSlot(slot.key, { focus: e.target.value })}
                >
                  {FOCUS_POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value} className="bg-[#141420]">
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {preview ? (
                <button
                  type="button"
                  disabled={busy}
                  className={btnSecondary}
                  onClick={() => patchSlot(slot.key, emptySlot())}
                >
                  Remove image
                </button>
              ) : null}
            </section>
          )
        })}
      </div>
    </form>
  )
}
