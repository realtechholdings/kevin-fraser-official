'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  /** Each entry renders as its own paragraph. */
  lines: string[]
  /** Optional callouts shown in an amber box (e.g. "2 of 20 already scanned"). */
  warnings?: string[]
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Themed replacement for window.confirm for destructive admin actions.
 * Escape / backdrop click cancel; the cancel button takes focus so Enter
 * cannot accidentally confirm.
 */
export default function ConfirmDialog({
  open,
  title,
  lines,
  warnings = [],
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--admin-panel)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 transition-colors hover:bg-white/10 disabled:opacity-50"
          style={{ color: 'var(--admin-muted)' }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <div className="mt-2 space-y-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              {lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {warnings.length ? (
              <ul className="mt-3 space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="admin-btn-secondary disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-[0.55rem] text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
