'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  Camera,
  CameraOff,
  CheckCircle,
  Clock,
  RotateCcw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'
import { formatShowDate } from '@/lib/format'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type ScanResult = {
  verdict:
    | 'valid'
    | 'already_used'
    | 'not_paid'
    | 'upgraded'
    | 'not_found'
    | 'invalid_ticket'
    | 'wrong_show'
    | 'undone'
    | 'info'
  scan?: {
    orderId: string
    email: string
    tierName: string
    tableName?: string
    quantity: number
    status: string
    ticket: number | null
    checkedIn: { ticket: number; at: string | null }[]
    show: { city: string; venue: string; date: string; tour: string } | null
  }
}

const VERDICT_META: Record<
  ScanResult['verdict'],
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  valid: {
    label: 'Valid — checked in',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: CheckCircle,
  },
  already_used: {
    label: 'Already checked in',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    icon: Clock,
  },
  not_paid: {
    label: 'Order not paid',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: XCircle,
  },
  upgraded: {
    label: 'Ticket was upgraded — use the new PDF',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
    icon: XCircle,
  },
  not_found: {
    label: 'Ticket not found',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: XCircle,
  },
  invalid_ticket: {
    label: 'Invalid ticket number',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: XCircle,
  },
  wrong_show: {
    label: 'Ticket is for a different show',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: XCircle,
  },
  undone: {
    label: 'Check-in undone',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    icon: RotateCcw,
  },
  info: {
    label: 'Order details',
    className: 'border-white/15 bg-white/5 text-white/80',
    icon: Search,
  },
}

function timeLabel(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

type ShowOption = {
  id: string
  city: string
  venue: string
  date: string
}

type Attendance = {
  sold: number
  checkedIn: number
  tiers: { name: string; sold: number; checkedIn: number }[]
}

function pct(checkedIn: number, sold: number) {
  return sold > 0 ? Math.round((checkedIn / sold) * 100) : 0
}

export default function ScannerAdminPanel({
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const pausedUntilRef = useRef(0)
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const busyRef = useRef(false)

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState({ orderId: '', ticket: '' })
  const [shows, setShows] = useState<ShowOption[]>([])
  const [showId, setShowId] = useState('')
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const showIdRef = useRef('')
  showIdRef.current = showId

  const loadAttendance = useCallback(async (id: string) => {
    if (!id) {
      setAttendance(null)
      return
    }
    try {
      const res = await fetch(`/api/admin/scanner/attendance?showId=${id}`)
      const data = await res.json()
      if (res.ok && data.attendance) setAttendance(data.attendance)
    } catch {
      // Non-fatal — stats refresh again on the next scan or poll
    }
  }, [])

  useEffect(() => {
    async function loadShows() {
      try {
        const res = await fetch('/api/admin/shows')
        const data = await res.json()
        if (!res.ok) return
        const options: ShowOption[] = (data.shows || [])
          .map((s: { id: string; city: string; venue: string; date: string }) => ({
            id: s.id,
            city: s.city,
            venue: s.venue,
            date: s.date,
          }))
          .sort(
            (a: ShowOption, b: ShowOption) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
        setShows(options)
        // Default the door to the next upcoming show
        const next = options.find(
          (s) => new Date(s.date).getTime() >= Date.now() - 6 * 60 * 60 * 1000,
        )
        if (next) setShowId(next.id)
      } catch {
        // Show list is a convenience — scanning still works without it
      }
    }
    void loadShows()
  }, [])

  // Keep attendance fresh while a show is selected (other doors may be scanning too)
  useEffect(() => {
    void loadAttendance(showId)
    if (!showId) return
    const interval = setInterval(() => void loadAttendance(showId), 20000)
    return () => clearInterval(interval)
  }, [showId, loadAttendance])

  const verify = useCallback(
    async (payload: Record<string, unknown>) => {
      busyRef.current = true
      setBusy(true)
      try {
        const res = await fetch('/api/admin/scanner/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, showId: showIdRef.current || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verification failed')
        setResult({ verdict: data.verdict, scan: data.scan })
        if (showIdRef.current) void loadAttendance(showIdRef.current)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Verification failed')
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [onError, loadAttendance],
  )

  const scanLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (
      !busyRef.current &&
      Date.now() >= pausedUntilRef.current &&
      video.readyState === video.HAVE_ENOUGH_DATA
    ) {
      const width = Math.min(video.videoWidth, 640)
      const height = Math.round(video.videoHeight * (width / video.videoWidth)) || 0
      if (width && height) {
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height)
          const image = ctx.getImageData(0, 0, width, height)
          const qr = jsQR(image.data, width, height)
          if (qr?.data) {
            const now = Date.now()
            const isRepeat =
              qr.data === lastCodeRef.current.code && now - lastCodeRef.current.at < 6000
            if (!isRepeat) {
              lastCodeRef.current = { code: qr.data, at: now }
              // Brief pause so one QR doesn't fire multiple times mid-request
              pausedUntilRef.current = now + 2500
              void verify({ code: qr.data, action: 'checkin' })
            }
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [verify])

  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      rafRef.current = requestAnimationFrame(scanLoop)
    } catch {
      setCameraError(
        'Could not access the camera. Allow camera permission, or use manual lookup below.',
      )
    }
  }

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const scan = result?.scan
  const meta = result ? VERDICT_META[result.verdict] : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Ticket Scanner</h2>
        <p className="mt-1 text-sm text-white/40">
          Scan the QR code on a ticket PDF to verify it and check the guest in at the door.
        </p>
      </div>

      <section className="admin-card space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2 md:items-end">
          <div>
            <label className={labelClass}>Checking in for</label>
            <select
              className={inputClass}
              value={showId}
              onChange={(e) => setShowId(e.target.value)}
            >
              <option value="" className="bg-[#141420]">
                Any show (no restriction)
              </option>
              {shows.map((s) => {
                const d = formatShowDate(s.date)
                return (
                  <option key={s.id} value={s.id} className="bg-[#141420]">
                    {s.city} · {s.venue} — {d.weekday} {d.day} {d.month}
                  </option>
                )
              })}
            </select>
            {showId ? (
              <p className="mt-1.5 text-xs text-white/35">
                Tickets for other shows will be rejected at this door.
              </p>
            ) : null}
          </div>
          {showId && attendance ? (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Users className="h-4 w-4" />
                  Attendance
                </p>
                <p className="text-sm tabular-nums text-white/70">
                  <span className="text-xl font-bold text-white">
                    {pct(attendance.checkedIn, attendance.sold)}%
                  </span>{' '}
                  · {attendance.checkedIn} of {attendance.sold} in
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct(attendance.checkedIn, attendance.sold)}%`,
                    background: 'var(--admin-accent)',
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {showId && attendance && attendance.tiers.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attendance.tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{tier.name}</p>
                  <p className="shrink-0 text-xs tabular-nums text-white/60">
                    {tier.checkedIn}/{tier.sold} · {pct(tier.checkedIn, tier.sold)}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct(tier.checkedIn, tier.sold)}%`,
                      background: 'var(--admin-accent)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : showId && attendance ? (
          <p className="text-sm text-white/40">No paid orders for this show yet.</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Camera</h3>
            {cameraOn ? (
              <button type="button" className={btnSecondary} onClick={stopCamera}>
                <CameraOff className="mr-1.5 inline h-4 w-4" />
                Stop
              </button>
            ) : (
              <button type="button" className={btnPrimary} onClick={() => void startCamera()}>
                <Camera className="mr-1.5 inline h-4 w-4" />
                Start scanning
              </button>
            )}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            {!cameraOn ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
                Camera off
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-2xl border-2 border-white/50" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {cameraError ? <p className="text-sm text-red-300">{cameraError}</p> : null}
          <p className="text-xs text-white/35">
            Each ticket page has its own QR code. A green result checks the guest in immediately;
            scanning the same ticket again shows &quot;already checked in&quot;.
          </p>
        </section>

        <div className="space-y-6">
          {result && meta ? (
            <section className={`rounded-2xl border p-6 ${meta.className}`}>
              <div className="flex items-center gap-2">
                <meta.icon className="h-5 w-5 shrink-0" />
                <p className="text-base font-semibold">{meta.label}</p>
              </div>

              {scan ? (
                <div className="mt-4 space-y-1.5 text-sm">
                  {scan.show ? (
                    <p className="font-medium text-white">
                      {scan.show.tour ? `${scan.show.tour} — ` : ''}
                      {scan.show.city} · {scan.show.venue}
                      {scan.show.date ? ` · ${scan.show.date}` : ''}
                    </p>
                  ) : null}
                  <p className="text-white/80">
                    {scan.tierName}
                    {scan.tableName ? ` · ${scan.tableName}` : ''}
                    {scan.ticket ? ` · Ticket ${scan.ticket} of ${scan.quantity}` : ` · ${scan.quantity} ticket(s)`}
                  </p>
                  <p className="text-white/60">{scan.email}</p>
                  <p className="text-white/60">
                    Checked in: {scan.checkedIn.length} of {scan.quantity}
                    {scan.checkedIn.length
                      ? ` (${scan.checkedIn
                          .map((c) => `#${c.ticket}${c.at ? ` ${timeLabel(c.at)}` : ''}`)
                          .join(', ')})`
                      : ''}
                  </p>
                  {result.verdict === 'not_paid' || result.verdict === 'upgraded' ? (
                    <p className="text-white/60">Order status: {scan.status}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {result.verdict === 'valid' || result.verdict === 'already_used' ? (
                  <button
                    type="button"
                    disabled={busy || !scan?.ticket}
                    className={btnGhost}
                    onClick={() =>
                      scan?.ticket &&
                      void verify({ orderId: scan.orderId, ticket: scan.ticket, action: 'undo' })
                    }
                  >
                    <RotateCcw className="mr-1.5 inline h-4 w-4" />
                    Undo check-in
                  </button>
                ) : null}
                {result.verdict === 'undone' ? (
                  <button
                    type="button"
                    disabled={busy || !scan?.ticket}
                    className={btnGhost}
                    onClick={() =>
                      scan?.ticket &&
                      void verify({ orderId: scan.orderId, ticket: scan.ticket, action: 'checkin' })
                    }
                  >
                    <CheckCircle className="mr-1.5 inline h-4 w-4" />
                    Check in again
                  </button>
                ) : null}
                <button type="button" className={btnGhost} onClick={() => setResult(null)}>
                  Clear
                </button>
              </div>
            </section>
          ) : (
            <section className="admin-card flex min-h-[120px] items-center justify-center p-6 text-sm text-white/40">
              Scan a ticket to see the result here.
            </section>
          )}

          <section className="admin-card space-y-4 p-6">
            <h3 className="text-sm font-semibold text-white">Manual lookup</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div>
                <label className={labelClass}>Order ID</label>
                <input
                  className={inputClass}
                  value={manual.orderId}
                  onChange={(e) => setManual({ ...manual, orderId: e.target.value.trim() })}
                  placeholder="From the ticket footer"
                />
              </div>
              <div>
                <label className={labelClass}>Ticket #</label>
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  value={manual.ticket}
                  onChange={(e) => setManual({ ...manual, ticket: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !manual.orderId || !manual.ticket}
                className={btnPrimary}
                onClick={() =>
                  void verify({
                    orderId: manual.orderId,
                    ticket: Number(manual.ticket),
                    action: 'checkin',
                  })
                }
              >
                <CheckCircle className="mr-1.5 inline h-4 w-4" />
                Verify & check in
              </button>
              <button
                type="button"
                disabled={busy || !manual.orderId}
                className={btnSecondary}
                onClick={() => void verify({ orderId: manual.orderId, action: 'lookup' })}
              >
                <Search className="mr-1.5 inline h-4 w-4" />
                Look up order
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
