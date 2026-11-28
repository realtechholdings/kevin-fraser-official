'use client'

import { CheckCircle, Clock, Minus, Plus, RotateCcw, Search, Users, XCircle } from 'lucide-react'
import type { Booking, BookingLine, HistoryEntry, LineState } from '@/lib/tickets/admissions'

export type ScanVerdict =
  | 'admitted'
  | 'booking'
  | 'found'
  | 'already_admitted'
  | 'partly_admitted'
  | 'not_admitted'
  | 'reversed'
  | 'not_paid'
  | 'upgraded'
  | 'refunded'
  | 'transferred'
  | 'not_found'
  | 'invalid_ticket'
  | 'wrong_show'

export type ScanView = {
  verdict: ScanVerdict
  booking: Booking | null
  /** How the booking was opened; recorded on the admission. */
  method: 'scan' | 'search'
  /** The line whose QR code was scanned. */
  scannedOrderId?: string
  /** The scanned page itself is void, though other tickets on the booking may be fine. */
  ticketVoided?: boolean
  /** Guests admitted or released by the last action. */
  count?: number
  /** Extra line under the verdict, e.g. why part of an admission was refused. */
  note?: string
}

export type AdmitLine = { orderId: string; quantity: number }

type Tone = 'good' | 'warn' | 'bad' | 'note' | 'plain'

const TONE_CLASS: Record<Tone, string> = {
  good: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  bad: 'border-red-500/40 bg-red-500/10 text-red-300',
  note: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  plain: 'border-white/15 bg-white/5 text-white/80',
}

const VERDICT_META: Record<ScanVerdict, { tone: Tone; icon: typeof CheckCircle }> = {
  admitted: { tone: 'good', icon: CheckCircle },
  booking: { tone: 'plain', icon: Users },
  found: { tone: 'plain', icon: Search },
  already_admitted: { tone: 'warn', icon: Clock },
  partly_admitted: { tone: 'warn', icon: Clock },
  not_admitted: { tone: 'bad', icon: XCircle },
  reversed: { tone: 'note', icon: RotateCcw },
  not_paid: { tone: 'bad', icon: XCircle },
  upgraded: { tone: 'bad', icon: XCircle },
  refunded: { tone: 'bad', icon: XCircle },
  transferred: { tone: 'bad', icon: XCircle },
  not_found: { tone: 'bad', icon: XCircle },
  invalid_ticket: { tone: 'bad', icon: XCircle },
  wrong_show: { tone: 'bad', icon: XCircle },
}

const CLOSED_LABEL: Record<Exclude<LineState, 'open'>, string> = {
  not_paid: 'Not paid',
  refunded: 'Refunded',
  upgraded: 'Upgraded to another ticket',
  transferred: 'Moved to another booking',
}

export function timeLabel(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return time
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`
}

function guests(count: number) {
  return `${count} guest${count === 1 ? '' : 's'}`
}

function Count({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2 text-center">
      <dt className="text-[11px] uppercase tracking-wide text-white/50">{label}</dt>
      <dd
        className={`mt-0.5 text-2xl font-bold tabular-nums ${strong ? 'text-white' : 'text-white/70'}`}
      >
        {value}
      </dd>
    </div>
  )
}

function LineCard({
  line,
  scanned,
  showStepper,
  quantity,
  busy,
  onQuantity,
}: {
  line: BookingLine
  scanned: boolean
  showStepper: boolean
  quantity: number
  busy: boolean
  onQuantity: (value: number) => void
}) {
  const closed = line.state !== 'open'
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 break-words text-sm font-semibold text-white">
          {line.tierName}
          {line.tableName ? <span className="font-normal text-white/60"> · {line.tableName}</span> : null}
        </p>
        <p className="shrink-0 text-xs text-white/40">
          {scanned ? 'Scanned · ' : ''}Ref {line.ref}
        </p>
      </div>

      {closed ? (
        <p className="mt-2 text-sm text-red-300">{CLOSED_LABEL[line.state as Exclude<LineState, 'open'>]}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <Count label="Purchased" value={line.purchased} />
            <Count label="Admitted" value={line.admitted} />
            <Count label="Remaining" value={line.remaining} strong />
          </dl>

          {showStepper && line.remaining > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-white/60">Admit now</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`One fewer for ${line.tierName}`}
                  disabled={busy || quantity <= 0}
                  onClick={() => onQuantity(quantity - 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span
                  className="w-10 text-center text-2xl font-bold tabular-nums text-white"
                  aria-live="polite"
                  aria-label={`${quantity} to admit for ${line.tierName}`}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`One more for ${line.tierName}`}
                  disabled={busy || quantity >= line.remaining}
                  onClick={() => onQuantity(quantity + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function HistoryRow({
  entry,
  showClass,
  supervisor,
  busy,
  onReverse,
}: {
  entry: HistoryEntry
  showClass: boolean
  supervisor: boolean
  busy: boolean
  onReverse: (entry: HistoryEntry) => void
}) {
  const when = timeLabel(entry.at)
  const classNote = showClass ? ` · ${entry.tierName}` : ''
  let text: string
  if (entry.kind === 'reversal') {
    text = `${entry.usherName} reversed ${guests(entry.quantity)} checked in before admission history${classNote}`
  } else if (entry.legacy) {
    text = `${guests(entry.quantity)} checked in before admission history was kept${classNote}`
  } else {
    text = `${entry.usherName} admitted ${guests(entry.quantity)}${classNote}`
  }
  const canReverse = supervisor && entry.kind === 'admit' && !entry.reversed

  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 text-sm">
        <p className={entry.reversed ? 'text-white/40 line-through' : 'text-white/80'}>
          {when ? <span className="tabular-nums text-white/50">{when} · </span> : null}
          {text}
          {entry.method === 'search' && !entry.reversed ? (
            <span className="text-white/40"> · by search</span>
          ) : null}
        </p>
        {entry.reversed ? (
          <p className="mt-0.5 text-sky-300">
            Reversed{entry.reversed.at ? ` ${timeLabel(entry.reversed.at)}` : ''} by {entry.reversed.by}
            {entry.reversed.reason ? ` · ${entry.reversed.reason}` : ''}
          </p>
        ) : null}
      </div>
      {canReverse ? (
        <button
          type="button"
          disabled={busy}
          className="admin-btn-secondary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
          onClick={() => onReverse(entry)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reverse
        </button>
      ) : null}
    </li>
  )
}

export default function ScannerBookingCard({
  view,
  label,
  detail,
  busy,
  supervisor,
  quantities,
  onQuantity,
  onAdmit,
  onReverse,
  onClear,
}: {
  view: ScanView
  label: string
  detail: string
  busy: boolean
  supervisor: boolean
  quantities: Record<string, number>
  onQuantity: (orderId: string, value: number) => void
  onAdmit: (lines: AdmitLine[]) => void
  onReverse: (entry: HistoryEntry) => void
  onClear: () => void
}) {
  const meta = VERDICT_META[view.verdict]
  const booking = view.booking
  const openLines = booking ? booking.lines.filter((line) => line.state === 'open') : []
  // The door turned this ticket away, so nobody is admitted from this card.
  const blocked = view.verdict === 'wrong_show' || view.verdict === 'invalid_ticket'
  const canAdmit = Boolean(booking) && !blocked && (booking?.remaining || 0) > 0
  // One ticket left on a one-line booking: nothing to choose, just admit.
  const single = openLines.length === 1 && openLines[0].remaining === 1
  const chosen: AdmitLine[] = openLines
    .map((line) => ({
      orderId: line.orderId,
      quantity: single ? 1 : Math.max(0, Math.min(quantities[line.orderId] || 0, line.remaining)),
    }))
    .filter((line) => line.quantity > 0)
  const everyone: AdmitLine[] = openLines
    .map((line) => ({ orderId: line.orderId, quantity: line.remaining }))
    .filter((line) => line.quantity > 0)
  const selected = chosen.reduce((sum, line) => sum + line.quantity, 0)
  const multiClass = booking ? new Set(booking.lines.map((line) => line.tierName)).size > 1 : false

  return (
    <section className={`min-w-0 rounded-2xl border p-4 sm:p-6 ${TONE_CLASS[meta.tone]}`}>
      <div className="flex items-start gap-2" role="status" aria-live="polite">
        <meta.icon className="mt-0.5 h-6 w-6 shrink-0" />
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug">{label}</p>
          {detail ? <p className="mt-0.5 text-sm text-white/70">{detail}</p> : null}
        </div>
      </div>

      {booking ? (
        <div className="mt-4 space-y-3">
          <div className="break-words">
            {booking.name ? <p className="text-base font-semibold text-white">{booking.name}</p> : null}
            {booking.email && booking.email !== booking.name ? (
              <p className="break-all text-sm text-white/60">{booking.email}</p>
            ) : null}
            {booking.show ? (
              <p className="mt-1 text-xs text-white/50">
                {booking.show.tour ? `${booking.show.tour} — ` : ''}
                {booking.show.city} · {booking.show.venue}
                {booking.show.date ? ` · ${booking.show.date}` : ''}
              </p>
            ) : null}
          </div>

          {booking.lines.map((line) => (
            <LineCard
              key={line.orderId}
              line={line}
              scanned={booking.lines.length > 1 && line.orderId === view.scannedOrderId}
              showStepper={canAdmit && !single}
              quantity={Math.min(quantities[line.orderId] || 0, line.remaining)}
              busy={busy}
              onQuantity={(value) => onQuantity(line.orderId, value)}
            />
          ))}

          {canAdmit ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={busy || selected < 1}
                className="admin-btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 sm:w-auto sm:min-w-[9rem]"
                onClick={() => onAdmit(chosen)}
              >
                <CheckCircle className="h-5 w-5" />
                {busy ? 'Admitting…' : `Admit ${selected}`}
              </button>
              {booking.remaining > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  className="admin-btn-secondary w-full py-3 text-base disabled:opacity-50 sm:w-auto"
                  onClick={() => onAdmit(everyone)}
                >
                  Admit all remaining ({booking.remaining})
                </button>
              ) : null}
            </div>
          ) : null}

          {booking.history.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Admission history
              </h4>
              <ul className="mt-1 divide-y divide-white/5">
                {booking.history.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    showClass={multiClass}
                    supervisor={supervisor && !blocked}
                    busy={busy}
                    onReverse={onReverse}
                  />
                ))}
              </ul>
              {!supervisor && booking.history.some((entry) => entry.kind === 'admit' && !entry.reversed) ? (
                <p className="mt-1 text-xs text-white/40">
                  Admitted by mistake? A door supervisor can reverse it.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <button type="button" className="admin-btn-secondary w-full sm:w-auto" onClick={onClear}>
          Next guest
        </button>
      </div>
    </section>
  )
}
