'use client'

import { useEffect, useRef, useState } from 'react'
import { Film, X } from 'lucide-react'

const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type Props = {
  /** Local video file, or a remote/proxy URL for an existing upload */
  videoSrc?: string | null
  disabled?: boolean
  onCapture: (file: File) => void
  className?: string
}

async function captureFrame(video: HTMLVideoElement): Promise<File> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('Video frame is not ready yet.')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not capture frame.')
  ctx.drawImage(video, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode frame.'))),
      'image/jpeg',
      0.92,
    )
  })

  const time = Math.round(video.currentTime * 10) / 10
  return new File([blob], `video-frame-${time}s.jpg`, { type: 'image/jpeg' })
}

export default function VideoFramePicker({ videoSrc, disabled, onCapture, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setCurrentTime(0)
    setDuration(0)
  }, [open, videoSrc])

  if (!videoSrc) return null

  return (
    <div className={className}>
      <button
        type="button"
        className={btnSecondary}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Film className="mr-1.5 inline h-4 w-4" />
        Pick frame from video
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141420] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Choose thumbnail frame</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Scrub to the moment you want, then capture. You can crop it next.
                </p>
              </div>
              <button
                type="button"
                className={btnGhost}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black">
              <video
                ref={videoRef}
                src={videoSrc}
                className="max-h-[50vh] w-full object-contain"
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  setDuration(Number.isFinite(v.duration) ? v.duration : 0)
                  setCurrentTime(v.currentTime || 0)
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onSeeked={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
            </div>

            <div className="space-y-4 border-t border-white/10 px-4 py-4">
              <div>
                <label className="admin-label">
                  Time · {currentTime.toFixed(1)}s
                  {duration ? ` / ${duration.toFixed(1)}s` : ''}
                </label>
                <input
                  className="w-full accent-[var(--admin-accent,#ff6b35)]"
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.05}
                  value={Math.min(currentTime, duration || 0)}
                  disabled={!duration || busy}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setCurrentTime(next)
                    const video = videoRef.current
                    if (video) video.currentTime = next
                  }}
                />
              </div>
              {error ? <p className="text-xs text-red-300">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      const video = videoRef.current
                      if (!video) return
                      setBusy(true)
                      setError('')
                      try {
                        video.pause()
                        const file = await captureFrame(video)
                        onCapture(file)
                        setOpen(false)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not capture frame')
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  {busy ? 'Capturing…' : 'Use this frame'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
