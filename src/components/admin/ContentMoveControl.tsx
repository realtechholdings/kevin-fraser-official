'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { KEVIN11_CATEGORIES, KEVIN11_CATEGORY_LABELS } from '@/lib/kevin11/categories'
import type { StudioCategoryDef } from '@/lib/studio/categories'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

export type ContentContainer = 'studio' | 'bonus' | 'kevin11'

const CONTAINER_LABELS: Record<ContentContainer, string> = {
  studio: 'The Studio',
  bonus: 'Showreel · Bonus',
  kevin11: 'Kevin11',
}

type Props = {
  from: ContentContainer
  itemId: string
  studioCategories?: StudioCategoryDef[]
  disabled?: boolean
  onMoved: (to: ContentContainer) => void
  onError: (msg: string) => void
  onMessage: (msg: string) => void
}

export default function ContentMoveControl({
  from,
  itemId,
  studioCategories = [],
  disabled,
  onMoved,
  onError,
  onMessage,
}: Props) {
  const destinations = (['studio', 'bonus', 'kevin11'] as ContentContainer[]).filter((c) => c !== from)
  const [to, setTo] = useState<ContentContainer>(destinations[0])
  const [category, setCategory] = useState(
    from === 'kevin11' ? 'comedy' : studioCategories[0]?.id || 'behind_the_scenes',
  )
  const [busy, setBusy] = useState(false)

  async function move() {
    if (!confirm(`Move this item to ${CONTAINER_LABELS[to]}?`)) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/admin/content/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          id: itemId,
          category: to === 'bonus' ? undefined : category,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Move failed')
      onMessage(`Moved to ${CONTAINER_LABELS[to]}.`)
      onMoved(to)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Move failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/50">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Move to another container
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className={labelClass}>Destination</label>
          <select
            className={inputClass}
            value={to}
            disabled={disabled || busy}
            onChange={(e) => {
              const next = e.target.value as ContentContainer
              setTo(next)
              if (next === 'studio') {
                setCategory(studioCategories[0]?.id || 'behind_the_scenes')
              } else if (next === 'kevin11') {
                setCategory('other')
              }
            }}
          >
            {destinations.map((c) => (
              <option key={c} value={c}>
                {CONTAINER_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        {to === 'studio' ? (
          <div>
            <label className={labelClass}>Studio category</label>
            <select
              className={inputClass}
              value={category}
              disabled={disabled || busy}
              onChange={(e) => setCategory(e.target.value)}
            >
              {studioCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : to === 'kevin11' ? (
          <div>
            <label className={labelClass}>Kevin11 category</label>
            <select
              className={inputClass}
              value={category}
              disabled={disabled || busy}
              onChange={(e) => setCategory(e.target.value)}
            >
              {KEVIN11_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {KEVIN11_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-end text-xs text-white/35">Bonus has no folders.</div>
        )}
        <div className="flex items-end">
          <button
            type="button"
            className={btnSecondary}
            disabled={disabled || busy}
            onClick={() => void move()}
          >
            {busy ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}
