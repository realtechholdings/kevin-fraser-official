'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Crop, ImagePlus, Trash2, X } from 'lucide-react'
import {
  IMAGE_CROP_PRESETS,
  getCroppedImageFile,
  type ImageCropPreset,
} from '@/lib/admin/imageCrop'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type Props = {
  label: string
  preset: ImageCropPreset | keyof typeof IMAGE_CROP_PRESETS
  /** Existing saved image preview URL */
  currentUrl?: string
  /** Pending cropped file preview URL (blob:) */
  pendingUrl?: string
  pendingFileName?: string
  disabled?: boolean
  required?: boolean
  onCropped: (file: File) => void
  onClearPending?: () => void
  onRemoveCurrent?: () => void
  removeCurrentChecked?: boolean
  onRemoveCurrentChange?: (checked: boolean) => void
  className?: string
}

function resolvePreset(
  preset: ImageCropPreset | keyof typeof IMAGE_CROP_PRESETS,
): ImageCropPreset {
  if (typeof preset === 'string') return IMAGE_CROP_PRESETS[preset]
  return preset
}

export default function ImageCropField({
  label,
  preset,
  currentUrl,
  pendingUrl,
  pendingFileName,
  disabled,
  required,
  onCropped,
  onClearPending,
  onRemoveCurrent,
  removeCurrentChecked,
  onRemoveCurrentChange,
  className,
}: Props) {
  const crop = resolvePreset(preset)
  const inputId = useId()
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState('image.jpg')
  const [open, setOpen] = useState(false)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function closeModal() {
    if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setOpen(false)
    setCropPos({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError('')
    setBusy(false)
  }

  function onPickFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    setSourceName(file.name || 'image.jpg')
    setCropPos({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError('')
    setOpen(true)
    if (onRemoveCurrentChange) onRemoveCurrentChange(false)
  }

  async function applyCrop() {
    if (!sourceUrl || !croppedAreaPixels) return
    setBusy(true)
    setError('')
    try {
      const file = await getCroppedImageFile({
        imageSrc: sourceUrl,
        pixelCrop: croppedAreaPixels,
        outputWidth: crop.outputWidth,
        fileName: sourceName,
      })
      onCropped(file)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crop failed')
      setBusy(false)
    }
  }

  const previewUrl = pendingUrl || (!removeCurrentChecked ? currentUrl : '')
  const previewAspect = crop.aspect

  return (
    <div className={className}>
      <label className={labelClass} htmlFor={inputId}>
        {label}
      </label>
      <p className="mb-2 text-xs text-white/35">
        {crop.hint} · crop to {crop.label} (~{crop.outputWidth}px wide)
      </p>

      {previewUrl ? (
        <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: String(previewAspect) }}
          />
          <p className="truncate px-3 py-2 text-[11px] text-white/40">
            {pendingUrl
              ? `Ready to upload${pendingFileName ? `: ${pendingFileName}` : ''}`
              : 'Current image'}
          </p>
        </div>
      ) : (
        <div
          className="mb-2 flex items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-white/30"
          style={{ aspectRatio: String(Math.min(previewAspect, 2.4)), minHeight: 96 }}
        >
          No image
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className={`${btnSecondary} cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
          <ImagePlus className="mr-1.5 inline h-4 w-4" />
          {previewUrl ? 'Choose & crop' : 'Upload & crop'}
          <input
            id={inputId}
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={disabled}
            required={required && !previewUrl}
            onChange={(e) => {
              void onPickFile(e.target.files?.[0] || null)
              e.target.value = ''
            }}
          />
        </label>

        {pendingUrl && onClearPending ? (
          <button type="button" disabled={disabled} className={btnGhost} onClick={onClearPending}>
            Clear new image
          </button>
        ) : null}

        {currentUrl && onRemoveCurrent && onRemoveCurrentChange ? (
          <label className="inline-flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              disabled={disabled || Boolean(pendingUrl)}
              checked={Boolean(removeCurrentChecked)}
              onChange={(e) => onRemoveCurrentChange(e.target.checked)}
            />
            Remove current
          </label>
        ) : currentUrl && onRemoveCurrent ? (
          <button type="button" disabled={disabled} className={btnDanger} onClick={onRemoveCurrent}>
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error && !open ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      {open && sourceUrl ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141420] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Crop className="h-4 w-4" />
                  Crop image
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {crop.label} · exports ~{crop.outputWidth}×
                  {Math.round(crop.outputWidth / crop.aspect)}px
                </p>
              </div>
              <button type="button" className={btnGhost} onClick={closeModal} disabled={busy}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-[min(55vh,420px)] bg-black">
              <Cropper
                image={sourceUrl}
                crop={cropPos}
                zoom={zoom}
                aspect={crop.aspect}
                onCropChange={setCropPos}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
              />
            </div>

            <div className="space-y-4 border-t border-white/10 px-4 py-4">
              <div>
                <label className={labelClass}>Zoom</label>
                <input
                  className="w-full accent-[var(--admin-accent,#ff6b35)]"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={busy}
                />
              </div>
              {error ? <p className="text-xs text-red-300">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => void applyCrop()}
                  disabled={busy || !croppedAreaPixels}
                >
                  {busy ? 'Cropping…' : 'Apply crop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
