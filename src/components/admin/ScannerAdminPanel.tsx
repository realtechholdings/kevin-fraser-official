'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, QrCode, RotateCcw, Search, UserCheck, Users } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import ScannerBookingCard, {
  timeLabel,
  type AdmitLine,
  type ScanVerdict,
  type ScanView,
} from '@/components/admin/ScannerBookingCard'
import { formatShowDate } from '@/lib/format'
import type { Booking, BookingSummary, HistoryEntry } from '@/lib/tickets/admissions'
import { isShowOnDoorNight } from '@/lib/tickets/doorDay'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'

/** How often an open booking and the attendance bar re-read the server. */
const BOOKING_POLL_MS = 3000
const ATTENDANCE_POLL_MS = 5000
/** An untouched booking stops refreshing after this long. */
const BOOKING_IDLE_MS = 3 * 60 * 1000
/** A code must leave the camera for this long before it is read again. */
const SAME_CODE_MS = 4000
const SCAN_INTERVAL_MS = 120

type ShowOption = {
  id: string
  city: string
  country: string
  venue: string
  date: string
}

type PracticeCode = {
  key: string
  label: string
  hint: string
  qrDataUrl: string
  purchased: number
  admitted: number
}

type PracticeState = {
  ready: boolean
  showId?: string
  codes?: PracticeCode[]
}

type Attendance = {
  sold: number
  checkedIn: number
  tiers: { name: string; sold: number; checkedIn: number }[]
}

type Refusal = { tierName: string; asked: number; remaining: number }

function pct(checkedIn: number, sold: number) {
  return sold > 0 ? Math.round((checkedIn / sold) * 100) : 0
}

function guests(count: number) {
  return `${count} guest${count === 1 ? '' : 's'}`
}

/** One to admit on the scanned line (or the first with anyone left); the usher adds the rest. */
function startingQuantities(booking: Booking | null, scannedOrderId?: string) {
  const quantities: Record<string, number> = {}
  if (!booking) return quantities
  const open = booking.lines.filter((line) => line.state === 'open' && line.remaining > 0)
  const first = open.find((line) => line.orderId === scannedOrderId) || open[0]
  for (const line of booking.lines) {
    quantities[line.orderId] = first && line.orderId === first.orderId ? 1 : 0
  }
  return quantities
}

function lastAdmission(booking: Booking | null): HistoryEntry | undefined {
  return booking?.history.find((entry) => entry.kind === 'admit' && !entry.reversed)
}

function describe(view: ScanView, practiceOn: boolean): { label: string; detail: string } {
  const booking = view.booking
  const remaining = booking?.remaining || 0
  const group = (booking?.purchased || 0) > 1
  switch (view.verdict) {
    case 'admitted':
      return {
        label: `Admitted ${view.count || 1}`,
        detail: group
          ? remaining > 0
            ? `${remaining} still to arrive on this booking`
            : 'Everyone on this booking is in'
          : '',
      }
    case 'booking':
      return {
        label: 'Group booking',
        detail: `${remaining} of ${booking?.purchased || 0} still to arrive. Choose how many to admit.`,
      }
    case 'found':
      return {
        label: 'Booking found',
        detail: group ? `${remaining} of ${booking?.purchased || 0} still to arrive.` : '',
      }
    case 'already_admitted': {
      const last = lastAdmission(booking)
      return {
        label: group ? 'Everyone on this booking is already in' : 'Already admitted',
        detail: last
          ? last.legacy
            ? `Checked in ${timeLabel(last.at)}`
            : `Last admitted ${timeLabel(last.at)} by ${last.usherName}`
          : '',
      }
    }
    case 'partly_admitted':
      return { label: `Admitted ${view.count || 0}, not everyone`, detail: view.note || '' }
    case 'not_admitted':
      return { label: 'Not admitted', detail: view.note || '' }
    case 'reversed':
      return {
        label: 'Admission reversed',
        detail: `${guests(view.count || 0)} back on the booking`,
      }
    case 'not_paid':
      return { label: 'Order not paid', detail: '' }
    case 'refunded':
      return {
        label: view.ticketVoided ? 'This ticket was refunded' : 'Booking was refunded',
        detail: view.ticketVoided && remaining > 0 ? 'Other tickets on the booking are still valid.' : '',
      }
    case 'upgraded':
      return {
        label: 'Ticket was upgraded',
        detail: 'Ask for the new ticket, or search the guest by name.',
      }
    case 'transferred':
      return {
        label: 'Ticket was moved',
        detail: 'Ask for the new ticket, or search the guest by name.',
      }
    case 'not_found':
      return { label: 'Ticket not found', detail: 'That is not one of our ticket codes.' }
    case 'invalid_ticket':
      return { label: 'Invalid ticket number', detail: '' }
    case 'wrong_show':
      return {
        label: practiceOn ? 'Real ticket, left unadmitted' : 'Ticket is for a different show',
        detail: practiceOn ? 'The practice door only admits the test codes.' : '',
      }
  }
}

function refusalNote(refused: Refusal[]) {
  if (!refused.length) return ''
  const parts = refused.map((item) =>
    item.remaining > 0
      ? `only ${item.remaining} left on ${item.tierName}`
      : `nobody left to admit on ${item.tierName}`,
  )
  const text = parts.join(', ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}. Another door has admitted from this booking.`
}

export default function ScannerAdminPanel({
  onMessage,
  onError,
  doorOnly = false,
  staffName = '',
  canReverse = false,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
  /** Scanner-only accounts stay on tonight's show. */
  doorOnly?: boolean
  /** The signed-in staff member; recorded on every admission. */
  staffName?: string
  /** Door supervisors can reverse an incorrect admission. */
  canReverse?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const lastCodeRef = useRef<{ code: string; seenAt: number }>({ code: '', seenAt: 0 })
  const busyRef = useRef(false)
  const showIdRef = useRef('')
  const practiceOnRef = useRef(false)
  const resumeShowIdRef = useRef('')
  const touchedRef = useRef(0)
  /** Bumped by every scan, admission and reversal, so a slower background refresh cannot overwrite them. */
  const changeSeqRef = useRef(0)
  const searchSeqRef = useRef(0)
  const onCodeRef = useRef<(code: string) => void>(() => {})
  const notifyRef = useRef({ onMessage, onError })

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [view, setView] = useState<ScanView | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [shows, setShows] = useState<ShowOption[]>([])
  const [showsReady, setShowsReady] = useState(false)
  const [showId, setShowId] = useState('')
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [practice, setPractice] = useState<PracticeState | null>(null)
  const [practiceOn, setPracticeOn] = useState(false)
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookingSummary[] | null>(null)
  const [resultsTruncated, setResultsTruncated] = useState(false)
  const [searching, setSearching] = useState(false)
  const [reverseTarget, setReverseTarget] = useState<HistoryEntry | null>(null)
  const [reverseReason, setReverseReason] = useState('')

  useEffect(() => {
    notifyRef.current = { onMessage, onError }
    showIdRef.current = showId
    practiceOnRef.current = practiceOn
  })

  const fail = useCallback((err: unknown, fallback: string) => {
    notifyRef.current.onError(err instanceof Error && err.message ? err.message : fallback)
  }, [])

  const setWorking = useCallback((working: boolean) => {
    busyRef.current = working
    setBusy(working)
  }, [])

  const loadAttendance = useCallback(async (id: string) => {
    if (!id) {
      setAttendance(null)
      return
    }
    try {
      const res = await fetch(`/api/admin/scanner/attendance?showId=${id}`)
      const data = await res.json()
      if (res.ok && data.attendance && showIdRef.current === id) setAttendance(data.attendance)
    } catch {
      // Non-fatal: the next poll tries again
    }
  }, [])

  const loadPractice = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scanner/practice')
      const data = await res.json()
      if (res.ok && data.practice) setPractice(data.practice)
    } catch {
      // The test can still be created from the button
    }
  }, [])

  /** After anything that changes who is inside: refresh the totals this device shows. */
  const afterChange = useCallback(() => {
    if (showIdRef.current) void loadAttendance(showIdRef.current)
    if (practiceOnRef.current) void loadPractice()
  }, [loadAttendance, loadPractice])

  /** A booking this device has just read or changed: bring its row in the search list up to date. */
  const syncResult = useCallback((booking: Booking | null) => {
    if (!booking) return
    const orderIds = new Set(booking.lines.map((line) => line.orderId))
    setResults((current) =>
      current
        ? current.map((result) =>
            result.lines.some((line) => orderIds.has(line.orderId))
              ? {
                  ...result,
                  lines: booking.lines,
                  purchased: booking.purchased,
                  admitted: booking.admitted,
                  remaining: booking.remaining,
                }
              : result,
          )
        : current,
    )
  }, [])

  const openView = useCallback(
    (next: ScanView) => {
      changeSeqRef.current += 1
      touchedRef.current = Date.now()
      setView(next)
      setQuantities(
        next.verdict === 'admitted' ? {} : startingQuantities(next.booking, next.scannedOrderId),
      )
      // A rejected scan carries only the scanned order, not the whole booking.
      if (next.verdict !== 'wrong_show' && next.verdict !== 'invalid_ticket') syncResult(next.booking)
    },
    [syncResult],
  )

  const closeView = useCallback(() => {
    changeSeqRef.current += 1
    setView(null)
    setQuantities({})
  }, [])

  useEffect(() => {
    async function loadShows() {
      try {
        const res = await fetch('/api/admin/shows')
        const data = await res.json()
        if (!res.ok) {
          setShowsReady(true)
          return
        }
        const options: ShowOption[] = (data.shows || [])
          .map(
            (s: { id: string; city: string; country?: string; venue: string; date: string }) => ({
              id: s.id,
              city: s.city,
              country: s.country || '',
              venue: s.venue,
              date: s.date,
            }),
          )
          .sort(
            (a: ShowOption, b: ShowOption) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
        const tonight = options.filter((s) => isShowOnDoorNight(s.date, s.city, s.country))
        const visible = doorOnly ? tonight : options
        setShows(visible)
        setShowsReady(true)
        if (practiceOnRef.current) return
        if (doorOnly) {
          if (tonight[0]) setShowId(tonight[0].id)
          return
        }
        // Default the door to the next upcoming show
        const next = options.find(
          (s) => new Date(s.date).getTime() >= Date.now() - 6 * 60 * 60 * 1000,
        )
        if (next) setShowId(next.id)
      } catch {
        setShowsReady(true)
        // Show list is a convenience: scanning still works without it
      }
    }
    void loadShows()
  }, [doorOnly])

  useEffect(() => {
    if (doorOnly) return
    const timer = setTimeout(() => void loadPractice(), 0)
    return () => clearTimeout(timer)
  }, [doorOnly, loadPractice])

  // Other doors are admitting too, so the totals re-read every few seconds while this tab is in front.
  useEffect(() => {
    const first = setTimeout(() => void loadAttendance(showId), 0)
    if (!showId) return () => clearTimeout(first)
    const interval = setInterval(() => {
      if (document.hidden) return
      void loadAttendance(showId)
      // The practice cards count admissions too, including ones made on another phone.
      if (practiceOnRef.current) void loadPractice()
    }, ATTENDANCE_POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [showId, loadAttendance, loadPractice])

  // Keep the open booking live: an admission at another door shows up here without a rescan.
  const blocked = view?.verdict === 'wrong_show' || view?.verdict === 'invalid_ticket'
  const liveAnchor = view?.booking && !blocked ? view.booking.anchorOrderId : ''
  useEffect(() => {
    if (!liveAnchor) return
    let stopped = false
    const interval = setInterval(async () => {
      if (document.hidden || busyRef.current) return
      if (Date.now() - touchedRef.current > BOOKING_IDLE_MS) return
      const seq = changeSeqRef.current
      try {
        const res = await fetch(
          `/api/admin/scanner/booking?orderId=${liveAnchor}&showId=${encodeURIComponent(showIdRef.current)}`,
        )
        const data = await res.json()
        if (stopped || !res.ok || !data.booking || seq !== changeSeqRef.current) return
        setView((current) =>
          current?.booking?.anchorOrderId === liveAnchor
            ? { ...current, booking: data.booking as Booking }
            : current,
        )
        syncResult(data.booking as Booking)
      } catch {
        // Offline for a moment: the next tick tries again
      }
    }, BOOKING_POLL_MS)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [liveAnchor, syncResult])

  const scan = useCallback(
    async (code: string) => {
      setWorking(true)
      try {
        const res = await fetch('/api/admin/scanner/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, showId: showIdRef.current || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not check that ticket')
        openView({
          verdict: data.verdict as ScanVerdict,
          booking: (data.booking as Booking) || null,
          method: 'scan',
          scannedOrderId: data.scannedOrderId,
          ticketVoided: Boolean(data.ticketVoided),
          count: data.admitted,
        })
        afterChange()
      } catch (err) {
        fail(err, 'Could not check that ticket')
      } finally {
        setWorking(false)
      }
    },
    [afterChange, fail, openView, setWorking],
  )

  async function admit(lines: AdmitLine[]) {
    const current = view
    if (!current?.booking || !lines.length || busyRef.current) return
    setWorking(true)
    try {
      const res = await fetch('/api/admin/scanner/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: showIdRef.current || undefined,
          anchorOrderId: current.booking.anchorOrderId,
          method: current.method,
          lines,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not admit those guests')
      const booking = (data.booking as Booking) || current.booking
      changeSeqRef.current += 1
      touchedRef.current = Date.now()
      setView({
        ...current,
        verdict: data.verdict as ScanVerdict,
        booking,
        ticketVoided: false,
        count: data.admitted,
        note: refusalNote((data.refused as Refusal[]) || []),
      })
      syncResult(booking)
      // Back to nothing selected, so a second tap cannot admit the same guests twice.
      setQuantities(data.verdict === 'admitted' ? {} : startingQuantities(booking, current.scannedOrderId))
      afterChange()
    } catch (err) {
      fail(err, 'Could not admit those guests')
    } finally {
      setWorking(false)
    }
  }

  async function reverse() {
    const target = reverseTarget
    const current = view
    if (!target || !current?.booking || busyRef.current) return
    setWorking(true)
    try {
      const res = await fetch('/api/admin/scanner/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: showIdRef.current || undefined,
          anchorOrderId: current.booking.anchorOrderId,
          entryId: target.id,
          reason: reverseReason,
        }),
      })
      const data = await res.json()
      changeSeqRef.current += 1
      touchedRef.current = Date.now()
      if (!res.ok) {
        // Someone else may have reversed it first: show the booking as it now stands.
        if (data.booking) {
          setView({ ...current, booking: data.booking as Booking })
          syncResult(data.booking as Booking)
        }
        throw new Error(data.error || 'Could not reverse that admission')
      }
      const booking = (data.booking as Booking) || current.booking
      setView({ ...current, verdict: 'reversed', booking, ticketVoided: false, count: data.reversed, note: '' })
      syncResult(booking)
      setQuantities(startingQuantities(booking, current.scannedOrderId))
      afterChange()
    } catch (err) {
      fail(err, 'Could not reverse that admission')
    } finally {
      setReverseTarget(null)
      setReverseReason('')
      setWorking(false)
    }
  }

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim()
      const seq = (searchSeqRef.current += 1)
      if (q.length < 2) {
        setResults(null)
        setSearching(false)
        return
      }
      setSearching(true)
      try {
        const res = await fetch(
          `/api/admin/scanner/search?q=${encodeURIComponent(q)}&showId=${encodeURIComponent(showIdRef.current)}`,
        )
        const data = await res.json()
        if (seq !== searchSeqRef.current) return
        if (!res.ok) throw new Error(data.error || 'Search failed')
        setResults((data.results as BookingSummary[]) || [])
        setResultsTruncated(Boolean(data.truncated))
      } catch (err) {
        if (seq === searchSeqRef.current) {
          setResults(null)
          fail(err, 'Search failed')
        }
      } finally {
        if (seq === searchSeqRef.current) setSearching(false)
      }
    },
    [fail],
  )

  // Search as the usher types, once they pause.
  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, showId, runSearch])

  async function openResult(result: BookingSummary) {
    if (busyRef.current) return
    setWorking(true)
    try {
      const res = await fetch(
        `/api/admin/scanner/booking?orderId=${result.anchorOrderId}&showId=${encodeURIComponent(showIdRef.current)}`,
      )
      const data = await res.json()
      if (!res.ok || !data.booking) throw new Error(data.error || 'Could not open that booking')
      const booking = data.booking as Booking
      const state = booking.lines[0]?.state || 'open'
      openView({
        verdict: state !== 'open' ? state : booking.remaining > 0 ? 'found' : 'already_admitted',
        booking,
        method: 'search',
      })
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      fail(err, 'Could not open that booking')
    } finally {
      setWorking(false)
    }
  }

  useEffect(() => {
    onCodeRef.current = (code: string) => {
      const now = Date.now()
      const last = lastCodeRef.current
      // Still held up to the camera: one read is enough.
      if (code === last.code && now - last.seenAt < SAME_CODE_MS) {
        last.seenAt = now
        return
      }
      if (busyRef.current) return
      lastCodeRef.current = { code, seenAt: now }
      void scan(code)
    }
  }, [scan])

  useEffect(() => {
    if (!cameraOn) return
    let frame = 0
    let lastRead = 0
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const now = Date.now()
      if (
        video &&
        canvas &&
        now - lastRead >= SCAN_INTERVAL_MS &&
        video.readyState === video.HAVE_ENOUGH_DATA
      ) {
        lastRead = now
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
            if (qr?.data) onCodeRef.current(qr.data)
          }
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [cameraOn])

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
    } catch {
      setCameraError('Could not access the camera. Allow camera permission, or search for the guest below.')
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  function changeShow(next: string) {
    setShowId(next)
    closeView()
    setResults(null)
  }

  async function runPractice(action: 'setup' | 'reset') {
    setPracticeBusy(true)
    try {
      const res = await fetch('/api/admin/scanner/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok || !data.practice?.showId) {
        throw new Error(data.error || 'Could not set up the scan test')
      }
      const next = data.practice as PracticeState
      if (!practiceOnRef.current) resumeShowIdRef.current = showIdRef.current
      setPractice(next)
      setPracticeOn(true)
      changeShow(next.showId || '')
      lastCodeRef.current = { code: '', seenAt: 0 }
      onMessage(
        action === 'reset'
          ? 'Test admissions cleared. Scan the same codes again.'
          : 'Scan test is ready. Real shows are untouched.',
      )
    } catch (err) {
      fail(err, 'Could not set up the scan test')
    } finally {
      setPracticeBusy(false)
    }
  }

  function stopPractice() {
    setPracticeOn(false)
    const resume = resumeShowIdRef.current
    const fallback = shows.find(
      (s) => new Date(s.date).getTime() >= Date.now() - 6 * 60 * 60 * 1000,
    )
    changeShow(resume && resume !== practice?.showId ? resume : fallback?.id || '')
  }

  const doorClosed = doorOnly && !showId
  const described = view ? describe(view, practiceOn) : null

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Ticket Scanner</h2>
          <p className="mt-1 text-sm text-white/40">
            Scan any ticket. A single ticket is admitted straight away; a group booking asks how
            many have arrived.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <UserCheck className="h-5 w-5 shrink-0 text-emerald-300" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-white/50">Scanner on duty</p>
            <p className="break-words text-sm font-semibold text-white">
              {staffName || 'Signed-in staff'}
              {canReverse ? <span className="font-normal text-sky-300"> · Supervisor</span> : null}
            </p>
          </div>
        </div>
      </div>

      {!doorOnly ? (
        <section
          className={`admin-card min-w-0 space-y-4 p-4 sm:p-6 ${practiceOn ? 'ring-2 ring-amber-500/50' : ''}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <QrCode className="h-4 w-4 shrink-0" />
                Scan test
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-white/40">
                Practice the door with fake tickets: two singles, a group, and a booking with two
                ticket classes. They are not a show: they stay off the site, out of sales and guest
                lists, and admitting them does not admit a real guest.
              </p>
            </div>
            {practiceOn ? (
              <button
                type="button"
                className={`${btnSecondary} w-full shrink-0 sm:w-auto`}
                onClick={stopPractice}
                disabled={practiceBusy}
              >
                Back to real shows
              </button>
            ) : (
              <button
                type="button"
                className={`${btnPrimary} w-full shrink-0 sm:w-auto`}
                onClick={() => void runPractice('setup')}
                disabled={practiceBusy}
              >
                {practiceBusy ? 'Setting up…' : practice?.ready ? 'Start scan test' : 'Set up scan test'}
              </button>
            )}
          </div>

          {practiceOn ? (
            <>
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Practice door is on. Only these test tickets will scan. A real ticket is rejected
                and stays unadmitted.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {(practice?.codes || []).map((code) => (
                  <div key={code.key} className="min-w-0 text-center">
                    <div className="mx-auto w-full max-w-[220px] rounded-xl bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={code.qrDataUrl}
                        alt={`Practice code: ${code.label}`}
                        className="aspect-square h-auto w-full"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-white/70">{code.label}</p>
                    <p className="text-[11px] text-white/40">{code.hint}</p>
                    <p
                      className={`text-[11px] ${code.admitted > 0 ? 'text-emerald-300' : 'text-white/40'}`}
                    >
                      {code.admitted} of {code.purchased} admitted
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-xs text-white/40">
                  Open these codes on another phone, then point this camera at them. The test
                  guests can also be found by searching &quot;test&quot;.
                </p>
                <button
                  type="button"
                  className={`${btnSecondary} w-full shrink-0 sm:w-auto`}
                  disabled={practiceBusy}
                  onClick={() => void runPractice('reset')}
                >
                  <RotateCcw className="mr-1.5 inline h-4 w-4" />
                  Reset test admissions
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="admin-card min-w-0 space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 md:items-end">
          <div>
            <label className={labelClass} htmlFor="scanner-show">
              Admitting for
            </label>
            {practiceOn ? (
              <>
                <p className={`${inputClass} flex items-center text-amber-100`}>Practice door</p>
                <p className="mt-1.5 text-xs text-amber-200">
                  Real shows are locked out until you leave the scan test.
                </p>
              </>
            ) : doorOnly && !showsReady ? (
              <p className={`${inputClass} flex items-center text-white/50`}>Loading shows…</p>
            ) : doorOnly && shows.length === 0 ? (
              <p className={`${inputClass} flex items-center text-white/70`}>
                No show is on tonight
              </p>
            ) : (
              <>
                <select
                  id="scanner-show"
                  className={inputClass}
                  value={showId}
                  disabled={doorOnly && shows.length === 1}
                  onChange={(e) => changeShow(e.target.value)}
                >
                  {doorOnly ? null : (
                    <option value="" className="bg-[#141420]">
                      Any show (no restriction)
                    </option>
                  )}
                  {shows.map((s) => {
                    const d = formatShowDate(s.date)
                    return (
                      <option key={s.id} value={s.id} className="bg-[#141420]">
                        {s.city} · {s.venue} — {d.weekday} {d.day} {d.month}
                      </option>
                    )
                  })}
                </select>
                {doorOnly ? (
                  <p className="mt-1.5 text-xs text-white/35">
                    This door admits for tonight&apos;s show. It stays open until 6:00 am local time.
                  </p>
                ) : showId ? (
                  <p className="mt-1.5 text-xs text-white/35">
                    Tickets for other shows will be rejected at this door.
                  </p>
                ) : null}
              </>
            )}
          </div>
          {showId && attendance ? (
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Users className="h-4 w-4 shrink-0" />
                  {practiceOn ? 'Test attendance' : 'Attendance'}
                  <span className="text-xs font-normal text-white/40">live, all doors</span>
                </p>
                <p className="text-sm tabular-nums text-white/70">
                  <span className="text-lg font-bold text-white sm:text-xl">
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
              <div key={tier.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="admin-card min-w-0 space-y-4 self-start p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-white">Camera</h3>
            {cameraOn ? (
              <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={stopCamera}>
                <CameraOff className="mr-1.5 inline h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                className={`${btnPrimary} w-full sm:w-auto`}
                disabled={doorClosed}
                onClick={() => void startCamera()}
              >
                <Camera className="mr-1.5 inline h-4 w-4" />
                Start scanning
              </button>
            )}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
            {!cameraOn ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
                Camera off
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-2xl border-2 border-white/50 sm:h-40 sm:w-40" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {cameraError ? <p className="text-sm text-red-300">{cameraError}</p> : null}
          <p className="text-xs text-white/35">
            Any QR code from a booking opens that booking. Scanning a group&apos;s code again later
            shows who is still to arrive.
          </p>
        </section>

        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div ref={resultRef} className="scroll-mt-4">
            {view && described ? (
              <ScannerBookingCard
                view={view}
                label={described.label}
                detail={described.detail}
                busy={busy}
                supervisor={canReverse}
                quantities={quantities}
                onQuantity={(orderId, value) => {
                  touchedRef.current = Date.now()
                  setQuantities((current) => ({ ...current, [orderId]: Math.max(0, value) }))
                }}
                onAdmit={(lines) => void admit(lines)}
                onReverse={(entry) => {
                  setReverseReason('')
                  setReverseTarget(entry)
                }}
                onClear={closeView}
              />
            ) : (
              <section className="admin-card flex min-h-[96px] items-center justify-center p-4 text-center text-sm text-white/40 sm:min-h-[120px] sm:p-6">
                Scan a ticket, or search for the guest, to see the booking here.
              </section>
            )}
          </div>

          <section className="admin-card min-w-0 space-y-3 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-white">Find a booking</h3>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                void runSearch(query)
              }}
            >
              <label className={labelClass} htmlFor="scanner-search">
                Guest name, email or booking reference
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  id="scanner-search"
                  className={`${inputClass} pl-9`}
                  type="search"
                  value={query}
                  disabled={doorClosed}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Joseph Smith"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </div>
            </form>
            <p className="text-xs text-white/35">
              The booking reference is the order number in the ticket footer; its last 8 characters
              are enough.
            </p>

            {searching && !results ? <p className="text-sm text-white/40">Searching…</p> : null}
            {results && results.length === 0 ? (
              <p className="text-sm text-white/60">
                No booking matches that{showId ? ' at this show' : ''}.
              </p>
            ) : null}
            {results && results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((result) => {
                  const closed = result.lines.every((line) => line.state !== 'open')
                  return (
                    <li key={result.anchorOrderId}>
                      <button
                        type="button"
                        disabled={busy}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left disabled:opacity-50"
                        onClick={() => void openResult(result)}
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium text-white">
                            {result.name}
                          </span>
                          {result.email && result.email !== result.name ? (
                            <span className="block break-all text-xs text-white/40">{result.email}</span>
                          ) : null}
                          <span className="mt-0.5 block text-xs text-white/60">
                            {result.lines
                              .map((line) =>
                                line.state === 'open'
                                  ? `${line.tierName}${line.tableName ? ` (${line.tableName})` : ''} ${line.admitted}/${line.purchased} in`
                                  : line.tierName,
                              )
                              .join(' · ')}
                            {!showId && result.show ? ` · ${result.show.city}, ${result.show.date}` : ''}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-right text-xs font-semibold ${
                            closed
                              ? 'text-red-300'
                              : result.remaining > 0
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                          }`}
                        >
                          {closed
                            ? result.lines[0]?.state === 'refunded'
                              ? 'Refunded'
                              : 'Not valid'
                            : result.remaining > 0
                              ? `${result.remaining} to admit`
                              : 'All in'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {results && resultsTruncated ? (
              <p className="text-xs text-white/40">More bookings match. Type more of the name to narrow it.</p>
            ) : null}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(reverseTarget)}
        title="Reverse this admission?"
        lines={
          reverseTarget
            ? [
                reverseTarget.legacy
                  ? `${guests(reverseTarget.quantity)} checked in before admission history was kept.`
                  : `${reverseTarget.usherName} admitted ${guests(reverseTarget.quantity)}${
                      reverseTarget.at ? ` at ${timeLabel(reverseTarget.at)}` : ''
                    } (${reverseTarget.tierName}).`,
                `${
                  reverseTarget.quantity === 1
                    ? 'That place goes back to remaining so the right guest'
                    : 'Those places go back to remaining so the right guests'
                } can be admitted. The reversal is recorded under your name.`,
              ]
            : []
        }
        confirmLabel="Reverse admission"
        busy={busy}
        onConfirm={() => void reverse()}
        onCancel={() => {
          setReverseTarget(null)
          setReverseReason('')
        }}
      >
        <label className={labelClass} htmlFor="reverse-reason">
          Reason (optional)
        </label>
        <input
          id="reverse-reason"
          className={inputClass}
          value={reverseReason}
          maxLength={200}
          onChange={(e) => setReverseReason(e.target.value)}
          placeholder="e.g. Admitted 4, only 3 arrived"
        />
      </ConfirmDialog>
    </div>
  )
}
