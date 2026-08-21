'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Star, Store, Trash2 } from 'lucide-react'
import type { PublicKevin11Content } from '@/lib/serialize'
import {
  DEFAULT_KEVIN11_SETTINGS,
  KEVIN11_CATEGORIES,
  KEVIN11_CATEGORY_LABELS,
  type Kevin11Category,
  type Kevin11CategoryDef,
  type Kevin11OverlaySlot,
  type Kevin11Settings,
} from '@/lib/kevin11/categories'
import {
  DEFAULT_STUDIO_CATEGORY_DEFS,
  type StudioCategoryDef,
} from '@/lib/studio/categories'
import ImageCropField from '@/components/admin/ImageCropField'
import FileDropZone from '@/components/admin/FileDropZone'
import VideoFramePicker from '@/components/admin/VideoFramePicker'
import SortableAdminList from '@/components/admin/SortableAdminList'
import ContentMoveControl from '@/components/admin/ContentMoveControl'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type Kevin11Form = {
  title: string
  description: string
  category: Kevin11Category
  ctaLabel: string
  ctaUrl: string
  overlaySlot: Kevin11OverlaySlot
  sortOrder: string
  featured: boolean
  published: boolean
}

const emptyForm: Kevin11Form = {
  title: '',
  description: '',
  category: 'comedy',
  ctaLabel: '',
  ctaUrl: '',
  overlaySlot: 'none',
  sortOrder: '0',
  featured: false,
  published: true,
}

async function uploadViaServer(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/admin/kevin11/upload', {
    method: 'POST',
    body: form,
  })
  let data: {
    success?: boolean
    error?: string
    code?: string
    key?: string
    publicUrl?: string
  } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error(`Upload failed (${res.status}).`)
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Upload failed') as Error & { code?: string }
    err.code = data.code
    throw err
  }
  if (!data.key) throw new Error('Upload did not return a storage key.')
  return {
    key: data.key,
    publicUrl: data.publicUrl || '',
  }
}

async function uploadViaPresign(file: File) {
  const contentType = file.type || 'application/octet-stream'
  const presignRes = await fetch('/api/admin/kevin11/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType,
    }),
  })
  const presign = await presignRes.json()
  if (!presignRes.ok) throw new Error(presign.error || 'Failed to get upload URL')

  let putRes: Response
  try {
    putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })
  } catch {
    throw new Error(
      'Could not reach Cloudflare R2 (often a CORS issue). Try a smaller file, or check bucket CORS allows PUT from this site.',
    )
  }
  if (!putRes.ok) throw new Error(`Upload to Cloudflare R2 failed (${putRes.status}).`)

  return {
    key: presign.key as string,
    publicUrl: (presign.publicUrl as string) || '',
  }
}

async function uploadFile(file: File) {
  // Prefer server upload (avoids browser→R2 CORS). Fall back to presigned PUT for larger files.
  try {
    return await uploadViaServer(file)
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
    if (code === 'TOO_LARGE' || file.size > 4 * 1024 * 1024) {
      return uploadViaPresign(file)
    }
    throw err
  }
}

function isVideoFile(file: File | null, mimeFallback = '') {
  const mime = file?.type || mimeFallback
  return mime.startsWith('video/')
}

function isImageFile(file: File | null, mimeFallback = '') {
  const mime = file?.type || mimeFallback
  return mime.startsWith('image/')
}

export default function Kevin11AdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<PublicKevin11Content[]>([])
  const [studioCategories, setStudioCategories] = useState<StudioCategoryDef[]>(
    DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c })),
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Kevin11Form>(emptyForm)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [thumbSeed, setThumbSeed] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PublicKevin11Content | null>(null)
  const [removeThumbnail, setRemoveThumbnail] = useState(false)
  const [filter, setFilter] = useState<Kevin11Category | 'all'>('all')
  const [kevin11Settings, setKevin11Settings] = useState<Kevin11Settings>(DEFAULT_KEVIN11_SETTINGS)
  const [categoryDrafts, setCategoryDrafts] = useState<Kevin11CategoryDef[]>(
    DEFAULT_KEVIN11_SETTINGS.categories.map((c) => ({ ...c })),
  )
  const [hoursHeading, setHoursHeading] = useState(DEFAULT_KEVIN11_SETTINGS.hoursHeading)

  async function load() {
    setLoading(true)
    try {
      const [kevinRes, studioRes, settingsRes] = await Promise.all([
        fetch('/api/admin/kevin11'),
        fetch('/api/admin/studio'),
        fetch('/api/admin/settings'),
      ])
      const data = await kevinRes.json()
      if (!kevinRes.ok) throw new Error(data.error || 'Failed to load Kevin11 content')
      setItems(data.items || [])
      setR2Configured(Boolean(data.r2Configured))

      if (studioRes.ok) {
        const studioData = await studioRes.json()
        if (studioData.categories?.length > 0) {
          setStudioCategories(studioData.categories)
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        const next = settingsData.settings?.kevin11 || DEFAULT_KEVIN11_SETTINGS
        setKevin11Settings(next)
        setCategoryDrafts(next.categories.map((c: Kevin11CategoryDef) => ({ ...c })))
        setHoursHeading(next.hoursHeading || DEFAULT_KEVIN11_SETTINGS.hoursHeading)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load Kevin11 content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (thumbPreview.startsWith('blob:')) URL.revokeObjectURL(thumbPreview)
      if (mediaPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(mediaPreviewUrl)
    }
  }, [thumbPreview, mediaPreviewUrl])

  function setCroppedThumb(file: File | null) {
    setThumbPreview((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : ''
    })
    setThumbFile(file)
    if (file) setRemoveThumbnail(false)
  }

  function setMedia(file: File | null) {
    setMediaPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : ''
    })
    setMediaFile(file)
    if (file && !form.title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
      if (base) setForm((f) => ({ ...f, title: base }))
    }
    if (file && isImageFile(file) && !thumbFile) {
      setThumbSeed(file)
    }
  }

  const visible = useMemo(() => {
    const list = filter === 'all' ? items : items.filter((item) => item.category === filter)
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
  }, [items, filter])

  function openCreate() {
    setEditingId(null)
    setEditingItem(null)
    setForm({
      ...emptyForm,
      category: filter !== 'all' ? filter : 'comedy',
      sortOrder: String(items.length),
    })
    setMedia(null)
    setCroppedThumb(null)
    setThumbSeed(null)
    setRemoveThumbnail(false)
    setShowForm(true)
  }

  function openEdit(item: PublicKevin11Content) {
    setEditingId(item.id)
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      ctaLabel: item.ctaLabel,
      ctaUrl: item.ctaUrl,
      overlaySlot: item.overlaySlot,
      sortOrder: String(item.sortOrder),
      featured: item.featured,
      published: item.published,
    })
    setMedia(null)
    setCroppedThumb(null)
    setThumbSeed(null)
    setRemoveThumbnail(false)
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const basePayload = {
        title: form.title,
        description: form.description,
        category: form.category,
        ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl,
        overlaySlot: form.category === 'comedy' ? form.overlaySlot : 'none',
        sortOrder: Number(form.sortOrder) || 0,
        featured: form.featured,
        published: form.published,
      }

      if (editingId) {
        const payload: Record<string, unknown> = { ...basePayload }

        if (mediaFile) {
          const media = await uploadFile(mediaFile)
          payload.mediaKey = media.key
          payload.mediaUrl = media.publicUrl || `/api/kevin11/${editingId}/file`
          payload.mimeType = mediaFile.type || 'application/octet-stream'
          payload.sizeBytes = mediaFile.size
        }

        if (thumbFile) {
          const thumb = await uploadFile(thumbFile)
          payload.thumbnailKey = thumb.key
          payload.thumbnailUrl = thumb.publicUrl || `/api/kevin11/${editingId}/thumbnail`
        } else if (removeThumbnail) {
          payload.thumbnailKey = ''
          payload.thumbnailUrl = ''
        }

        const res = await fetch(`/api/admin/kevin11/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Update failed')
        onMessage('Kevin11 content updated.')
      } else {
        if (!mediaFile) throw new Error('Choose a video or image to upload.')
        if (!isVideoFile(mediaFile) && !isImageFile(mediaFile)) {
          throw new Error('Kevin11 media must be a video or image.')
        }
        const media = await uploadFile(mediaFile)
        let thumbnailKey = ''
        let thumbnailUrl = ''
        if (thumbFile) {
          const thumb = await uploadFile(thumbFile)
          thumbnailKey = thumb.key
          thumbnailUrl = thumb.publicUrl
        } else if (isImageFile(mediaFile)) {
          thumbnailKey = media.key
          thumbnailUrl = media.publicUrl
        }

        const res = await fetch('/api/admin/kevin11', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...basePayload,
            mediaKey: media.key,
            mediaUrl: media.publicUrl,
            thumbnailKey,
            thumbnailUrl,
            mimeType: mediaFile.type || 'application/octet-stream',
            sizeBytes: mediaFile.size,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Create failed')
        onMessage('Kevin11 content uploaded.')
      }

      setShowForm(false)
      setEditingId(null)
      setEditingItem(null)
      setForm(emptyForm)
      setMedia(null)
      setCroppedThumb(null)
      setThumbSeed(null)
      setRemoveThumbnail(false)
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      onError(
        message === 'Failed to fetch'
          ? 'Network error while uploading. Refresh and try again, or use a smaller file.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: PublicKevin11Content) {
    if (!confirm(`Delete “${item.title}”? This removes the file from R2 too.`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/admin/kevin11/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Kevin11 content deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeatured(item: PublicKevin11Content) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/kevin11/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !item.featured }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function reorderVisible(orderedIds: string[]) {
    onError('')
    setItems((prev) =>
      prev.map((item) => {
        const index = orderedIds.indexOf(item.id)
        return index >= 0 ? { ...item, sortOrder: index } : item
      }),
    )

    const res = await fetch('/api/admin/kevin11/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
    const data = await res.json()
    if (!res.ok) {
      onError(data.error || 'Reorder failed')
      await load()
      return
    }
    onMessage('Order saved.')
  }

  async function saveHeadings() {
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kevin11: {
            hoursHeading,
            categories: categoryDrafts.map((c, index) => ({
              ...c,
              sortOrder: index,
            })),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save headings')
      const next = data.settings.kevin11 as Kevin11Settings
      setKevin11Settings(next)
      setCategoryDrafts(next.categories.map((c) => ({ ...c })))
      setHoursHeading(next.hoursHeading)
      onMessage('Kevin11 headings saved.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save headings')
    } finally {
      setBusy(false)
    }
  }

  const frameVideoSrc =
    mediaPreviewUrl && isVideoFile(mediaFile)
      ? mediaPreviewUrl
      : editingItem && isVideoFile(null, editingItem.mimeType)
        ? editingItem.mediaUrl
        : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Kevin11</h2>
          <p className="mt-1 text-sm text-white/40">
            Customise headings, then drop uploads for comedy overlays, merch, and CTAs.
          </p>
        </div>
        <button type="button" disabled={busy || !r2Configured} onClick={openCreate} className={btnPrimary}>
          <Plus className="mr-1.5 inline h-4 w-4" />
          Upload
        </button>
      </div>

      <section className="admin-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Headings</h3>
            <p className="mt-1 text-xs text-white/40">
              Overlay status line and category labels (same idea as Studio tabs).
            </p>
          </div>
          <button type="button" disabled={busy} onClick={() => void saveHeadings()} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save headings'}
          </button>
        </div>
        <div>
          <label className={labelClass}>Hours / status heading</label>
          <input
            className={inputClass}
            value={hoursHeading}
            onChange={(e) => setHoursHeading(e.target.value)}
            placeholder="Open Eventually."
          />
        </div>
        <div className="space-y-3">
          {categoryDrafts.map((draft, index) => (
            <div
              key={draft.id}
              className="grid gap-3 rounded-xl border border-white/10 p-3 md:grid-cols-[1fr_auto]"
            >
              <div>
                <label className={labelClass}>
                  {draft.id === 'comedy' ? 'Comedy label' : draft.id === 'merch' ? 'Merch label' : 'Other label'}
                </label>
                <input
                  className={inputClass}
                  value={draft.label}
                  onChange={(e) =>
                    setCategoryDrafts((prev) =>
                      prev.map((c) => (c.id === draft.id ? { ...c, label: e.target.value } : c)),
                    )
                  }
                />
                <p className="mt-1 text-[11px] text-white/30">Slug: {draft.id} (fixed)</p>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy || index === 0}
                  onClick={() =>
                    setCategoryDrafts((prev) => {
                      if (index === 0) return prev
                      const next = prev.slice()
                      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                      return next
                    })
                  }
                >
                  Up
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy || index === categoryDrafts.length - 1}
                  onClick={() =>
                    setCategoryDrafts((prev) => {
                      if (index >= prev.length - 1) return prev
                      const next = prev.slice()
                      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                      return next
                    })
                  }
                >
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!r2Configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Cloudflare R2 is not configured. Add the R2 env vars, then redeploy.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? btnPrimary : btnGhost}
        >
          All
        </button>
        {KEVIN11_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={filter === category ? btnPrimary : btnGhost}
          >
            {categoryDrafts.find((c) => c.id === category)?.label ||
              KEVIN11_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={save} className="admin-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit Kevin11 item' : 'Upload Kevin11 content'}
            </h3>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setEditingItem(null)
                setMedia(null)
                setCroppedThumb(null)
                setThumbSeed(null)
                setRemoveThumbnail(false)
              }}
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as Kevin11Category,
                    overlaySlot:
                      e.target.value === 'comedy' ? f.overlaySlot : 'none',
                  }))
                }
              >
                {KEVIN11_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryDrafts.find((c) => c.id === category)?.label ||
              KEVIN11_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            {form.category === 'comedy' ? (
              <div>
                <label className={labelClass}>Hero overlay (comedy only)</label>
                <select
                  className={inputClass}
                  value={form.overlaySlot}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      overlaySlot: e.target.value as Kevin11OverlaySlot,
                    }))
                  }
                >
                  <option value="none">Auto / none</option>
                  <option value="left">Top left of Kevin</option>
                  <option value="right">Top right of Kevin</option>
                </select>
              </div>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>CTA label (optional)</label>
              <input
                className={inputClass}
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="Shop now"
              />
            </div>
            <div>
              <label className={labelClass}>CTA URL (optional)</label>
              <input
                className={inputClass}
                type="url"
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FileDropZone
              label={editingId ? 'Replace media (optional)' : 'Media (video or image)'}
              accept="video/*,image/*"
              disabled={busy}
              required={!editingId}
              fileName={mediaFile?.name}
              hint="Drag & drop, or browse. Images and videos both supported."
              onFile={setMedia}
              preview={
                editingId && editingItem?.mediaUrl && !mediaFile ? (
                  <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {editingItem.mimeType.startsWith('video/') ? (
                      <video
                        src={editingItem.mediaUrl}
                        controls
                        className="max-h-40 w-full object-contain"
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editingItem.mediaUrl}
                        alt=""
                        className="max-h-40 w-full object-contain"
                      />
                    )}
                    <p className="truncate px-3 py-2 text-[11px] text-white/40">Current media</p>
                  </div>
                ) : mediaPreviewUrl ? (
                  <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {isImageFile(mediaFile) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaPreviewUrl} alt="" className="max-h-40 w-full object-contain" />
                    ) : (
                      <video
                        src={mediaPreviewUrl}
                        controls
                        className="max-h-40 w-full object-contain"
                        preload="metadata"
                      />
                    )}
                  </div>
                ) : null
              }
            />

            <div className="space-y-3">
              <ImageCropField
                label={editingId ? 'Thumbnail' : 'Thumbnail (optional)'}
                preset="kevin11Thumb"
                currentUrl={editingItem?.thumbnailUrl || ''}
                pendingUrl={thumbPreview}
                pendingFileName={thumbFile?.name}
                seedFile={thumbSeed}
                onSeedConsumed={() => setThumbSeed(null)}
                disabled={busy}
                onCropped={(file) => setCroppedThumb(file)}
                onClearPending={() => setCroppedThumb(null)}
                removeCurrentChecked={removeThumbnail}
                onRemoveCurrentChange={setRemoveThumbnail}
              />
              {frameVideoSrc ? (
                <VideoFramePicker
                  videoSrc={frameVideoSrc}
                  disabled={busy}
                  onCapture={(file) => setThumbSeed(file)}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              Featured
            </label>
          </div>

          {editingId ? (
            <ContentMoveControl
              from="kevin11"
              itemId={editingId}
              studioCategories={studioCategories}
              disabled={busy}
              onMessage={onMessage}
              onError={onError}
              onMoved={async () => {
                setShowForm(false)
                setEditingId(null)
                setEditingItem(null)
                await load()
              }}
            />
          ) : null}

          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Upload to R2'}
          </button>
        </form>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Library</h3>
            <p className="mt-0.5 text-xs text-white/35">Drag the grip handle to reorder</p>
          </div>
          <span className="text-xs text-white/40">{visible.length} items</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : (
          <SortableAdminList
            items={visible}
            disabled={busy}
            onReorder={reorderVisible}
            empty={
              <div className="px-5 py-12 text-center text-sm text-white/40">
                <Store className="mx-auto mb-3 h-8 w-8 opacity-40" />
                No Kevin11 content yet. Drop comedy, merch, or other.
              </div>
            }
            renderItem={(item) => (
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {item.thumbnailUrl || item.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      <Store className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {categoryDrafts.find((c) => c.id === item.category)?.label ||
                      KEVIN11_CATEGORY_LABELS[item.category]}{' '}
                    ·{' '}
                    {item.mimeType?.startsWith('image/') ? 'Image' : 'Video'} ·{' '}
                    {item.published ? 'Published' : 'Draft'}
                    {item.overlaySlot !== 'none' ? ` · overlay ${item.overlaySlot}` : ''}
                    {item.ctaLabel ? ` · CTA` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleFeatured(item)}
                    className={btnGhost}
                    title="Toggle featured"
                  >
                    <Star className={`h-4 w-4 ${item.featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                  <button type="button" disabled={busy} onClick={() => openEdit(item)} className={btnSecondary}>
                    Edit
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(item)} className={btnDanger}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </section>
    </div>
  )
}
