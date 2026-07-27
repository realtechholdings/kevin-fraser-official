'use client'

import { useEffect, useState } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import type { AISettings } from '@/lib/settings/defaults'
import { DEFAULT_AI_SETTINGS } from '@/lib/settings/defaults'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

async function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/admin/settings/avatar', {
    method: 'POST',
    body: form,
  })

  let data: { success?: boolean; error?: string; key?: string; publicUrl?: string } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error(
      res.ok
        ? 'Avatar upload returned an invalid response.'
        : `Avatar upload failed (${res.status}).`,
    )
  }

  if (!res.ok) throw new Error(data.error || 'Avatar upload failed')
  if (!data.key) throw new Error('Avatar upload did not return a storage key.')

  return {
    key: data.key,
    publicUrl: data.publicUrl || '/api/settings/avatar',
  }
}

export default function AIKevAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [ai, setAi] = useState<AISettings>(DEFAULT_AI_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [r2Configured, setR2Configured] = useState(true)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load AI settings')
      setAi(data.settings?.ai || DEFAULT_AI_SETTINGS)
      setR2Configured(Boolean(data.r2Configured))
      setPreviewUrl(data.settings?.ai?.avatarUrl || '')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load AI settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!avatarFile) return
    const url = URL.createObjectURL(avatarFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      let next = { ...ai }
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile)
        next = {
          ...next,
          avatarKey: uploaded.key,
          avatarUrl: '/api/settings/avatar',
        }
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai: next }),
      })

      let data: { success?: boolean; error?: string; settings?: { ai: AISettings } } = {}
      try {
        data = await res.json()
      } catch {
        throw new Error(`Save failed (${res.status}). Try again.`)
      }
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setAi(data.settings!.ai)
      setPreviewUrl(data.settings!.ai.avatarUrl || '')
      setAvatarFile(null)
      onMessage('AI Kev settings saved.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      onError(
        message === 'Failed to fetch'
          ? 'Network error while saving. If you selected an avatar, check R2 bucket permissions; otherwise refresh and try again.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  function restorePromptDefaults() {
    setAi((prev) => ({
      ...prev,
      displayName: DEFAULT_AI_SETTINGS.displayName,
      greeting: DEFAULT_AI_SETTINGS.greeting,
      systemPrompt: DEFAULT_AI_SETTINGS.systemPrompt,
    }))
  }

  function clearAvatar() {
    setAvatarFile(null)
    setPreviewUrl('')
    setAi((prev) => ({ ...prev, avatarKey: '', avatarUrl: '' }))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Kev</h2>
          <p className="mt-1 text-sm text-white/40">
            Avatar, greeting, system prompt, and speaking examples for the site assistant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={restorePromptDefaults} className={btnSecondary}>
            <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
            Restore defaults
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save AI Kev'}
          </button>
        </div>
      </div>

      {!r2Configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          R2 is not configured — avatar upload is disabled until R2 env vars are set.
        </div>
      ) : null}

      <section className="admin-card space-y-4 p-5">
        <h3 className="text-sm font-semibold text-white">Avatar</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/5 text-2xl">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="AI Kev avatar" className="h-full w-full object-cover" />
            ) : (
              '🎭'
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <label className={labelClass}>Upload image</label>
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              disabled={!r2Configured || busy}
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={clearAvatar} className={btnGhost}>
                Remove avatar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card space-y-4 p-5">
        <div>
          <label className={labelClass}>Display name</label>
          <input
            className={inputClass}
            value={ai.displayName}
            onChange={(e) => setAi((a) => ({ ...a, displayName: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Greeting (first chat message)</label>
          <textarea
            className={inputClass}
            rows={3}
            value={ai.greeting}
            onChange={(e) => setAi((a) => ({ ...a, greeting: e.target.value }))}
            required
          />
        </div>
      </section>

      <section className="admin-card space-y-4 p-5">
        <div>
          <label className={labelClass}>System prompt — how AI Kev talks</label>
          <p className="mb-2 text-xs text-white/40">
            Core instructions for personality, worlds, and boundaries.
          </p>
          <textarea
            className={`${inputClass} font-mono text-xs leading-relaxed`}
            rows={14}
            value={ai.systemPrompt}
            onChange={(e) => setAi((a) => ({ ...a, systemPrompt: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Vocabulary & speaking examples</label>
          <p className="mb-2 text-xs text-white/40">
            Paste phrases, slang, catchphrases, or sample lines that sound like Kevin. The assistant
            will use these as a style guide.
          </p>
          <textarea
            className={`${inputClass} font-mono text-xs leading-relaxed`}
            rows={10}
            value={ai.vocabularyNotes}
            onChange={(e) => setAi((a) => ({ ...a, vocabularyNotes: e.target.value }))}
            placeholder={`Examples:\n- "Nje shame"\n- "Ladies & gentlemen…"\n- Warm Aussie energy, punchy, never corporate\n- Sample: "If you're coming to the show, grab tickets on The Stage — don't leave it late."`}
          />
        </div>
        <p className="inline-flex items-center gap-2 text-xs text-white/35">
          <ImagePlus className="h-3.5 w-3.5" />
          Prompt + vocabulary are applied on every AI Guide reply.
        </p>
      </section>
    </form>
  )
}
