'use client'

import { useId, useState, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

type Props = {
  label: string
  accept: string
  disabled?: boolean
  required?: boolean
  fileName?: string
  hint?: string
  /** Optional preview below the drop zone */
  preview?: ReactNode
  onFile: (file: File | null) => void
  className?: string
}

export default function FileDropZone({
  label,
  accept,
  disabled,
  required,
  fileName,
  hint,
  preview,
  onFile,
  className,
}: Props) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function pick(file: File | null) {
    onFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0] || null
    if (file) pick(file)
  }

  return (
    <div className={className}>
      <label className="admin-label" htmlFor={inputId}>
        {label}
      </label>
      {hint ? <p className="mb-2 text-xs text-white/35">{hint}</p> : null}
      {preview}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={onDrop}
        className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          dragging
            ? 'border-[var(--admin-accent,#ff6b35)] bg-[var(--admin-accent,#ff6b35)]/10'
            : 'border-white/15 bg-white/[0.02]'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <Upload className="mx-auto mb-2 h-5 w-5 text-white/40" />
        <p className="text-sm text-white/70">
          {fileName ? (
            <>
              Selected: <span className="font-medium text-white">{fileName}</span>
            </>
          ) : (
            'Drag & drop a file here'
          )}
        </p>
        <p className="mt-1 text-xs text-white/35">or</p>
        <label
          className={`${btnSecondary} mt-3 inline-flex cursor-pointer ${disabled ? 'pointer-events-none' : ''}`}
        >
          Browse
          <input
            id={inputId}
            className="sr-only"
            type="file"
            accept={accept}
            disabled={disabled}
            required={required && !fileName}
            onChange={(e) => {
              pick(e.target.files?.[0] || null)
              e.target.value = ''
            }}
          />
        </label>
        {fileName ? (
          <button
            type="button"
            className="admin-btn-ghost mt-2"
            disabled={disabled}
            onClick={() => pick(null)}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
