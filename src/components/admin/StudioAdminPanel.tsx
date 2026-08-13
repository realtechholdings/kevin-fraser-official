'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clapperboard, Plus, Star, Trash2 } from 'lucide-react'
import type { PublicStudioContent } from '@/lib/serialize'
import { slugify } from '@/lib/format'
import {
  DEFAULT_STUDIO_CATEGORY_DEFS,
  studioCategoryLabel,
  type StudioCategoryDef,
} from '@/lib/studio/categories'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type StudioForm = {
  title: string
  description: string
  category: string
  sortOrder: string
  featured: boolean
  published: boolean
}

type CategoryDraft = StudioCategoryDef & { localKey: string; originalId: string }

async function uploadFile(file: File) {
  const presignRes = await fetch('/api/admin/studio/presign', {
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

function toDrafts(categories: StudioCategoryDef[]): CategoryDraft[] {
  return categories.map((c, index) => ({
    ...c,
    sortOrder: index,
    localKey: `${c.id}-${index}`,
    originalId: c.id,
  }))
}

export default function StudioAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<PublicStudioContent[]>([])
  const [categories, setCategories] = useState<StudioCategoryDef[]>(
    DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c })),
  )
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>(
    toDrafts(DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c }))),
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StudioForm>({
    title: '',
    description: '',
    category: DEFAULT_STUDIO_CATEGORY_DEFS[0].id,
    sortOrder: '0',
    featured: false,
    published: true,
  })
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | 'all'>('all')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/studio')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load studio content')
      const nextCategories: StudioCategoryDef[] =
        data.categories?.length > 0
          ? data.categories
          : DEFAULT_STUDIO_CATEGORY_DEFS.map((c) => ({ ...c }))
      setItems(data.items || [])
      setCategories(nextCategories)
      setCategoryDrafts(toDrafts(nextCategories))
      setR2Configured(Boolean(data.r2Configured))
      setForm((f) => ({
        ...f,
        category: nextCategories.some((c) => c.id === f.category)
          ? f.category
          : nextCategories[0]?.id || '',
      }))
      setFilter((prev) =>
        prev === 'all' || nextCategories.some((c) => c.id === prev) ? prev : 'all',
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load studio content')
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

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.category, (map.get(item.category) || 0) + 1)
    }
    return map
  }, [items])

  function openCreate() {
    setEditingId(null)
    setForm({
      title: '',
      description: '',
      category: categories[0]?.id || '',
      sortOrder: '0',
      featured: false,
      published: true,
    })
    setMediaFile(null)
    setThumbFile(null)
    setShowForm(true)
  }

  function openEdit(item: PublicStudioContent) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      sortOrder: String(item.sortOrder),
      featured: item.featured,
      published: item.published,
    })
    setMediaFile(null)
    setThumbFile(null)
    setShowForm(true)
  }

  function addCategory() {
    const label = 'New category'
    const baseId = slugify(label) || 'category'
    let id = baseId
    let n = 2
    const used = new Set(categoryDrafts.map((c) => c.id))
    while (used.has(id)) {
      id = `${baseId}-${n++}`
    }
    setCategoryDrafts((prev) => [
      ...prev,
      {
        id,
        label,
        sortOrder: prev.length,
        localKey: `new-${Date.now()}`,
        originalId: '',
      },
    ])
  }

  function updateCategoryDraft(localKey: string, patch: Partial<StudioCategoryDef>) {
    setCategoryDrafts((prev) =>
      prev.map((c) => {
        if (c.localKey !== localKey) return c
        const next = { ...c, ...patch }
        if (patch.label !== undefined && !c.originalId) {
          // Brand-new categories keep slug in sync with label until first save.
          next.id = slugify(patch.label) || c.id
        }
        return next
      }),
    )
  }

  function removeCategoryDraft(localKey: string) {
    const draft = categoryDrafts.find((c) => c.localKey === localKey)
    if (!draft) return
    const count = counts.get(draft.id) || 0
    if (count > 0) {
      onError(`“${draft.label}” still has ${count} clip${count === 1 ? '' : 's'}. Reassign them first.`)
      return
    }
    if (categoryDrafts.length <= 1) {
      onError('At least one category is required.')
      return
    }
    setCategoryDrafts((prev) => prev.filter((c) => c.localKey !== localKey))
  }

  async function saveCategories() {
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const cleaned = categoryDrafts
        .map((c, index) => ({
          id: slugify(c.id) || slugify(c.label),
          label: c.label.trim(),
          sortOrder: index,
        }))
        .filter((c) => c.id && c.label)

      if (cleaned.length === 0) throw new Error('At least one category is required.')

      const ids = cleaned.map((c) => c.id)
      if (new Set(ids).size !== ids.length) {
        throw new Error('Category slugs must be unique.')
      }

      const renames: Array<{ from: string; to: string }> = []
      for (const draft of categoryDrafts) {
        const nextId = slugify(draft.id) || slugify(draft.label)
        if (draft.originalId && nextId && draft.originalId !== nextId) {
          renames.push({ from: draft.originalId, to: nextId })
        }
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio: {
            categories: cleaned,
            renames,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save categories')
      onMessage('Studio categories saved.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save categories')
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
      if (editingId) {
        const res = await fetch(`/api/admin/studio/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            sortOrder: Number(form.sortOrder) || 0,
            featured: form.featured,
            published: form.published,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Update failed')
        onMessage('Studio content updated.')
      } else {
        if (!mediaFile) throw new Error('Choose a video to upload.')
        const media = await uploadFile(mediaFile)
        let thumbnailKey = ''
        let thumbnailUrl = ''
        if (thumbFile) {
          const thumb = await uploadFile(thumbFile)
          thumbnailKey = thumb.key
          thumbnailUrl = thumb.publicUrl
        }

        const res = await fetch('/api/admin/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
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
        onMessage('Studio video uploaded.')
      }

      setShowForm(false)
      setEditingId(null)
      setMediaFile(null)
      setThumbFile(null)
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: PublicStudioContent) {
    if (!confirm(`Delete “${item.title}”? This removes the file from R2 too.`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/admin/studio/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      onMessage('Studio content deleted.')
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFeatured(item: PublicStudioContent) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/studio/${item.id}`, {
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
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Categories</h2>
            <p className="mt-1 text-sm text-white/40">
              Create, rename, and reorder Studio tabs. Changing a slug migrates existing clips.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={addCategory} className={btnSecondary}>
              <Plus className="mr-1.5 inline h-4 w-4" />
              Add category
            </button>
            <button type="button" disabled={busy} onClick={() => void saveCategories()} className={btnPrimary}>
              {busy ? 'Saving…' : 'Save categories'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {categoryDrafts.map((draft, index) => (
            <div key={draft.localKey} className="admin-card grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={draft.label}
                  onChange={(e) => updateCategoryDraft(draft.localKey, { label: e.target.value })}
                  placeholder="Behind the Scenes"
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={inputClass}
                  value={draft.id}
                  onChange={(e) => updateCategoryDraft(draft.localKey, { id: slugify(e.target.value) })}
                  placeholder="behind_the_scenes"
                />
                <p className="mt-1 text-[11px] text-white/30">
                  {counts.get(draft.id) || 0} clip{(counts.get(draft.id) || 0) === 1 ? '' : 's'}
                </p>
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
              <div className="flex items-end">
                <button
                  type="button"
                  className={btnDanger}
                  disabled={busy}
                  onClick={() => removeCategoryDraft(draft.localKey)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">The Studio</h2>
            <p className="mt-1 text-sm text-white/40">
              Upload videos into your categories.
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
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter(category.id)}
              className={filter === category.id ? btnPrimary : btnGhost}
            >
              {category.label}
            </button>
          ))}
        </div>

        {showForm ? (
          <form onSubmit={save} className="admin-card space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? 'Edit studio item' : 'Upload studio video'}
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
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
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
                  <label className={labelClass}>Video file</label>
                  <input
                    className={inputClass}
                    type="file"
                    accept="video/*"
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
              <Clapperboard className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No studio videos yet. Upload the first one.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {visible.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/30">
                        <Clapperboard className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {studioCategoryLabel(item.category, categories)} ·{' '}
                      {item.published ? 'Published' : 'Draft'} · order {item.sortOrder}
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
    </div>
  )
}
