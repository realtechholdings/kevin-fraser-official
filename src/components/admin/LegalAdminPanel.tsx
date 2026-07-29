'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'
import type { LegalDocumentSettings, LegalSettings } from '@/lib/settings/defaults'
import {
  DEFAULT_LEGAL_SETTINGS,
  DEFAULT_PRIVACY_DOCUMENT,
  DEFAULT_REFUND_DOCUMENT,
  DEFAULT_TERMS_DOCUMENT,
} from '@/lib/settings/legalDefaults'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type DocKey = keyof LegalSettings

const DOCS: { id: DocKey; label: string; href: string; defaults: LegalDocumentSettings }[] = [
  { id: 'terms', label: 'Terms of Service', href: '/terms', defaults: DEFAULT_TERMS_DOCUMENT },
  {
    id: 'refundPolicy',
    label: 'Refund Policy',
    href: '/refund-policy',
    defaults: DEFAULT_REFUND_DOCUMENT,
  },
  { id: 'privacy', label: 'Privacy', href: '/privacy', defaults: DEFAULT_PRIVACY_DOCUMENT },
]

export default function LegalAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [legal, setLegal] = useState<LegalSettings>(DEFAULT_LEGAL_SETTINGS)
  const [active, setActive] = useState<DocKey>('terms')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load policies')
      setLegal(data.settings?.legal || DEFAULT_LEGAL_SETTINGS)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doc = legal[active]
  const meta = DOCS.find((d) => d.id === active)!

  function updateDoc(patch: Partial<LegalDocumentSettings>) {
    setLegal((prev) => ({
      ...prev,
      [active]: { ...prev[active], ...patch },
    }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    onError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal: {
            [active]: legal[active],
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setLegal(data.settings.legal)
      onMessage(`${meta.label} saved.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function resetCurrent() {
    if (!confirm(`Reset ${meta.label} to the default text?`)) return
    updateDoc({ ...meta.defaults })
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
          <h2 className="text-2xl font-bold text-white">Terms & Policies</h2>
          <p className="mt-1 text-sm text-white/40">
            Edit Terms of Service, Refund Policy, and Privacy. Use markdown headings (
            <code className="text-white/60">## Section</code>), lists (
            <code className="text-white/60">- item</code>), links, and{' '}
            <code className="text-white/60">**bold**</code>.
          </p>
        </div>
        <a
          href={meta.href}
          target="_blank"
          rel="noopener noreferrer"
          className={btnGhost}
        >
          View page
          <ExternalLink className="ml-1.5 inline h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {DOCS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={active === item.id ? btnPrimary : btnGhost}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-card space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              value={doc.title}
              onChange={(e) => updateDoc({ title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <input
              className={inputClass}
              value={doc.subtitle}
              onChange={(e) => updateDoc({ subtitle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Body</label>
          <textarea
            className={`${inputClass} min-h-[28rem] font-mono text-xs leading-relaxed`}
            value={doc.body}
            onChange={(e) => updateDoc({ body: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : `Save ${meta.label}`}
          </button>
          <button type="button" disabled={busy} onClick={resetCurrent} className={btnSecondary}>
            <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
            Reset to default
          </button>
        </div>
      </div>
    </form>
  )
}
