'use client'

import { useEffect, useMemo, useState } from 'react'
import { Film, Plus, Star, Trash2 } from 'lucide-react'
import type { PublicBonusContent } from '@/lib/serialize'
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

type BonusForm = {
  title: string
  description: string
  sortOrder: string
  featured: boolean
  published: boolean
}

const emptyForm: BonusForm = {
  title: '',
  description: '',
  sortOrder: '0',
  featured: false,
  published: true,
}

async function uploadFile(file: File) {
  const presignRes = await fetch('/api/admin/bonus/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  })
  const presign = await presignRes.json()
  if (!presignRes.ok) throw new Error(presign.error || 'Failed to get upload URL')

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!putRes.ok) throw new Error('Upload to Cloudflare R2 failed')

  return {
    key: presign.key as string,
    publicUrl: (presign.publicUrl as string) || '',
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

export default function BonusAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<PublicBonusContent[]>([])
  const [studioCategories, setStudioCategories] = useState<StudioCategoryDef[]>(
    DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c })),
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BonusForm>(emptyForm)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [thumbSeed, setThumbSeed] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PublicBonusContent | null>(null)
  const [removeThumbnail, setRemoveThumbnail] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [bonusRes, studioRes] = await Promise.all([
        fetch('/api/admin/bonus'),
        fetch('/api/admin/studio'),
      ])
      const data = await bonusRes.json()
      if (!bonusRes.ok) throw new Error(data.error || 'Failed to load bonus content')
      setItems(data.items || [])
      setR2Configured(Boolean(data.r2Configured))

      if (studioRes.ok) {
        const studioData = await studioRes.json()
        if (studioData.categories?.length > 0) {
          setStudioCategories(studioData.categories)
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load bonus content')
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

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [items],
  )

  function openCreate() {
    setEditingId(null)
    setEditingItem(null)
    setForm({ ...emptyForm, sortOrder: String(items.length) })
    setMedia(null)
    setCroppedThumb(null)
    setThumbSeed(null)
    setRemoveThumbnail(false)
    setShowForm(true)
  }

  function openEdit(item: PublicBonusContent) {
    setEditingId(item.id)
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description,
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
      if (editingId) {
        const payload: Record<string, unknown> = {
          title: form.title,
          description: form.description,
          sortOrder: Number(form.sortOrder) || 0,
          featured: form.featured,
          published: form.published,
        }

        if (mediaFile) {
          const media = await uploadFile(mediaFile)
          payload.mediaKey = media.key
          payload.mediaUrl = media.publicUrl || `/api/bonus/${editingId}/file`
          payload.mimeType = mediaFile.type || 'application/octet-stream'
          payload.sizeBytes = mediaFile.size
        }

        if (thumbFile) {
          const thumb = await uploadFile(thumbFile)
          payload.thumbnailKey = thumb.key
          payload.thumbnailUrl = thumb.publicUrl || `/api/bonus/${editingId}/thumbnail`
        } else if (removeThumbnail) {
          payload.thumbnailKey = ''
          payload.thumbnailUrl = ''
        }

        const res = await fetch(`/api/admin/bonus/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Update failed')
        onMessage('Bonus content updated.')
      } else {
        if (!mediaFile) throw new Error('Choose a media file to upload.')
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

        const res = await fetch('/api/admin/bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            mediaKey: media.key,
            mediaUrl: media.publicUrl,
            thumbnailKey,
            thumbnailUrl,
            mimeType: mediaFile.type || 'application/octet-stream',
            sizeBytes: mediaFile.size,
            sortOrder: Number(form.sortOrder) || 0,
            featured: form.featured,
            published: form.published,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Create failed')
        onMessage('Bonus content uploaded.')
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
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: PublicBonusContent) {
    if (!confirm(`Delete “${item.title}”? This removes the file from R2 too.`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/admin/bonus/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Bonus content deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeatured(item: PublicBonusContent) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/bonus/${item.id}`, {
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

    const res = await fetch('/api/admin/bonus/reorder', {
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
          <h2 className="text-2xl font-bold text-white">Bonus Content</h2>
          <p className="mt-1 text-sm text-white/40">
            Drop uploads, drag to reorder, and move items between folders or containers.
          </p>
        </div>
        <button type="button" disabled={busy || !r2Configured} onClick={openCreate} className={btnPrimary}>
          <Plus className="mr-1.5 inline h-4 w-4" />
          Upload
        </button>
      </div>

      {!r2Configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Cloudflare R2 is not configured. Add{' '}
          <code className="text-amber-100">R2_ACCOUNT_ID</code>,{' '}
          <code className="text-amber-100">R2_ACCESS_KEY_ID</code>,{' '}
          <code className="text-amber-100">R2_SECRET_ACCESS_KEY</code>,{' '}
          <code className="text-amber-100">R2_BUCKET_NAME</code>, and{' '}
          <code className="text-amber-100">R2_PUBLIC_BASE_URL</code> to env, then redeploy.
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={save} className="admin-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Edit bonus item' : 'Upload bonus item'}
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
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FileDropZone
              label={editingId ? 'Replace media (optional)' : 'Media file'}
              accept="video/*,image/*,audio/*"
              disabled={busy}
              required={!editingId}
              fileName={mediaFile?.name}
              hint="Drag & drop, or browse. Video, image, or audio."
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
                    ) : editingItem.mimeType.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editingItem.mediaUrl}
                        alt=""
                        className="max-h-40 w-full object-contain"
                      />
                    ) : (
                      <p className="px-3 py-4 text-xs text-white/50">Current media on file</p>
                    )}
                    <p className="truncate px-3 py-2 text-[11px] text-white/40">Current media</p>
                  </div>
                ) : mediaPreviewUrl ? (
                  <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {isImageFile(mediaFile) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaPreviewUrl} alt="" className="max-h-40 w-full object-contain" />
                    ) : isVideoFile(mediaFile) ? (
                      <video
                        src={mediaPreviewUrl}
                        controls
                        className="max-h-40 w-full object-contain"
                        preload="metadata"
                      />
                    ) : (
                      <p className="truncate px-3 py-2 text-[11px] text-white/40">{mediaFile?.name}</p>
                    )}
                  </div>
                ) : null
              }
            />

            <div className="space-y-3">
              <ImageCropField
                label={editingId ? 'Thumbnail' : 'Thumbnail (optional)'}
                preset="bonusThumb"
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
              from="bonus"
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
          <span className="text-xs text-white/40">{sorted.length} items</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : (
          <SortableAdminList
            items={sorted}
            disabled={busy}
            onReorder={reorderVisible}
            empty={
              <div className="px-5 py-12 text-center text-sm text-white/40">
                <Film className="mx-auto mb-3 h-8 w-8 opacity-40" />
                No bonus clips yet. Drop a file to upload the first one.
              </div>
            }
            renderItem={(item) => (
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {item.thumbnailUrl ||
                  (item.mimeType?.startsWith('image/') ? item.mediaUrl : '') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        item.thumbnailUrl ||
                        (item.mimeType?.startsWith('image/') ? item.mediaUrl : '')
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {item.mimeType} · {item.published ? 'Published' : 'Draft'}
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
