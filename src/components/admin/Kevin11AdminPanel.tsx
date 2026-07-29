'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Star, Store, Trash2 } from 'lucide-react'
import type { PublicKevin11Content } from '@/lib/serialize'
import {
  KEVIN11_CATEGORIES,
  KEVIN11_CATEGORY_LABELS,
  type Kevin11Category,
  type Kevin11OverlaySlot,
} from '@/lib/kevin11/categories'

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

export default function Kevin11AdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<PublicKevin11Content[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Kevin11Form>(emptyForm)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Kevin11Category | 'all'>('all')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/kevin11')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load Kevin11 content')
      setItems(data.items || [])
      setR2Configured(Boolean(data.r2Configured))
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

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.category === filter)),
    [items, filter],
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setMediaFile(null)
    setThumbFile(null)
    setShowForm(true)
  }

  function openEdit(item: PublicKevin11Content) {
    setEditingId(item.id)
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
    setMediaFile(null)
    setThumbFile(null)
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const payload = {
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
        const media = await uploadFile(mediaFile)
        let thumbnailKey = ''
        let thumbnailUrl = ''
        if (thumbFile) {
          const thumb = await uploadFile(thumbFile)
          thumbnailKey = thumb.key
          thumbnailUrl = thumb.publicUrl
        }

        const res = await fetch('/api/admin/kevin11', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
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
      setForm(emptyForm)
      setMediaFile(null)
      setThumbFile(null)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Kevin11</h2>
          <p className="mt-1 text-sm text-white/40">
            Upload comedy (hero overlays), merch, and other store content — optional CTAs.
          </p>
        </div>
        <button type="button" disabled={busy || !r2Configured} onClick={openCreate} className={btnPrimary}>
          <Plus className="mr-1.5 inline h-4 w-4" />
          Upload
        </button>
      </div>

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
            {KEVIN11_CATEGORY_LABELS[category]}
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
                    {KEVIN11_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sort order</label>
              <input
                className={inputClass}
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
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

          {!editingId ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Media (video or image)</label>
                <input
                  className={inputClass}
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Thumbnail (optional)</label>
                <input
                  className={inputClass}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          ) : null}

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

          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Upload to R2'}
          </button>
        </form>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Library</h3>
          <span className="text-xs text-white/40">{visible.length} items</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/40">
            <Store className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No Kevin11 content yet. Upload comedy, merch, or other.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
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
                    {KEVIN11_CATEGORY_LABELS[item.category]} ·{' '}
                    {item.published ? 'Published' : 'Draft'}
                    {item.overlaySlot !== 'none' ? ` · overlay ${item.overlaySlot}` : ''}
                    {item.ctaLabel ? ` · CTA` : ''} · order {item.sortOrder}
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
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
