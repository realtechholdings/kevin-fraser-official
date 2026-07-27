'use client'

import { useEffect, useState } from 'react'
import { Film, Plus, Star, Trash2 } from 'lucide-react'
import type { PublicBonusContent } from '@/lib/serialize'

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

export default function BonusAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<PublicBonusContent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BonusForm>(emptyForm)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bonus')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load bonus content')
      setItems(data.items || [])
      setR2Configured(Boolean(data.r2Configured))
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

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setMediaFile(null)
    setThumbFile(null)
    setShowForm(true)
  }

  function openEdit(item: PublicBonusContent) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
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
      if (editingId) {
        const res = await fetch(`/api/admin/bonus/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            sortOrder: Number(form.sortOrder) || 0,
            featured: form.featured,
            published: form.published,
          }),
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
      setForm(emptyForm)
      setMediaFile(null)
      setThumbFile(null)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Bonus Content</h2>
          <p className="mt-1 text-sm text-white/40">
            Upload exclusive clips to Cloudflare R2 for the Showreel Bonus tab.
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
              <label className={labelClass}>Sort order</label>
              <input
                className={inputClass}
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
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

          {!editingId ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Media file</label>
                <input
                  className={inputClass}
                  type="file"
                  accept="video/*,image/*,audio/*"
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
          <span className="text-xs text-white/40">{items.length} items</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/40">
            <Film className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No bonus clips yet. Upload the first one.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {item.mimeType} · {item.published ? 'Published' : 'Draft'} · order {item.sortOrder}
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
