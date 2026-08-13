'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_SHOWREEL_SETTINGS,
  type ShowreelImageSlot,
  type ShowreelSettings,
} from '@/lib/settings/defaults'
import ImageCropField from '@/components/admin/ImageCropField'
import type { IMAGE_CROP_PRESETS } from '@/lib/admin/imageCrop'

const btnPrimary = 'admin-btn-primary disabled:opacity-50'

const SLOTS: {
  key: keyof ShowreelSettings
  title: string
  preset: keyof typeof IMAGE_CROP_PRESETS
}[] = [
  {
    key: 'pageHero',
    title: 'Page hero',
    preset: 'showreelHero',
  },
  {
    key: 'reelsBanner',
    title: 'Reels tab banner',
    preset: 'showreelTab',
  },
  {
    key: 'bonusBanner',
    title: 'Bonus tab banner',
    preset: 'showreelTab',
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

  async function onCropped(key: keyof ShowreelSettings, file: File) {
    setBusy(true)
    onError('')
    try {
      const uploaded = await uploadShowreelImage(file)
      const preview = uploaded.publicUrl || URL.createObjectURL(file)
      patchSlot(key, {
        imageKey: uploaded.key,
        imageUrl: preview || `/api/settings/showreel/${key}`,
        focus: 'center center',
      })
      onMessage('Image cropped & uploaded — click Save banners to publish.')
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
            Crop each banner to the correct size, then save.
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
              <h3 className="text-sm font-semibold text-white">{slot.title}</h3>
              <ImageCropField
                label="Banner image"
                preset={slot.preset}
                currentUrl={preview}
                disabled={busy}
                onCropped={(file) => void onCropped(slot.key, file)}
                onRemoveCurrent={() => patchSlot(slot.key, emptySlot())}
              />
            </section>
          )
        })}
      </div>
    </form>
  )
}
