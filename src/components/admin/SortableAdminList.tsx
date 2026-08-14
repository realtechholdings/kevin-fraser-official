'use client'

import { useState, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'

export type SortableItem = { id: string }

type Props<T extends SortableItem> = {
  items: T[]
  disabled?: boolean
  onReorder: (orderedIds: string[]) => void | Promise<void>
  renderItem: (item: T, index: number) => ReactNode
  empty?: ReactNode
}

/** HTML5 drag-and-drop reorder list for admin libraries. */
export default function SortableAdminList<T extends SortableItem>({
  items,
  disabled,
  onReorder,
  renderItem,
  empty,
}: Props<T>) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (items.length === 0) return <>{empty}</>

  async function commit(nextIds: string[]) {
    setSaving(true)
    try {
      await onReorder(nextIds)
    } finally {
      setSaving(false)
      setDragId(null)
      setOverId(null)
    }
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const ids = items.map((i) => i.id)
    const from = ids.indexOf(fromId)
    const to = ids.indexOf(toId)
    if (from < 0 || to < 0) return
    const next = ids.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    void commit(next)
  }

  return (
    <div className={`divide-y divide-white/5 ${saving || disabled ? 'opacity-70' : ''}`}>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={!disabled && !saving}
          onDragStart={(e) => {
            setDragId(item.id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', item.id)
          }}
          onDragEnd={() => {
            setDragId(null)
            setOverId(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (dragId && dragId !== item.id) setOverId(item.id)
          }}
          onDragLeave={() => {
            if (overId === item.id) setOverId(null)
          }}
          onDrop={(e) => {
            e.preventDefault()
            const fromId = e.dataTransfer.getData('text/plain') || dragId
            if (fromId) reorder(fromId, item.id)
          }}
          className={`flex flex-wrap items-center gap-3 px-5 py-4 transition-colors ${
            overId === item.id ? 'bg-white/[0.06]' : ''
          } ${dragId === item.id ? 'opacity-50' : ''}`}
        >
          <button
            type="button"
            className="cursor-grab touch-none text-white/35 active:cursor-grabbing"
            aria-label="Drag to reorder"
            disabled={disabled || saving}
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  )
}
