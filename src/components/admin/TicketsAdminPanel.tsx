'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Mail,
  RefreshCw,
  Ticket,
  UserPlus,
} from 'lucide-react'
import { formatPrice, formatShowDate } from '@/lib/format'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type ShowOption = {
  id: string
  label: string
  city: string
  venue: string
  date: string | null
  status: string
  currency: string
  tiers: {
    id: string
    name: string
    priceCents: number
    currency: string
    capacity: number
    ticketsSold: number
    soldOut: boolean
    legacy: boolean
  }[]
}

type RecentManual = {
  id: string
  createdAt: string | null
  email: string
  holderName: string
  quantity: number
  tierName: string
  note: string
  confirmationEmailSentAt: string | null
  show: { id: string; city: string; venue: string; date: string | null; tour: string } | null
}

function downloadBase64Pdf(filename: string, base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function TicketsAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [shows, setShows] = useState<ShowOption[]>([])
  const [recent, setRecent] = useState<RecentManual[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [showId, setShowId] = useState('')
  const [tierId, setTierId] = useState('')
  const [holderName, setHolderName] = useState('')
  const [email, setEmail] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [downloadAfter, setDownloadAfter] = useState(true)
  const [countAgainstInventory, setCountAgainstInventory] = useState(true)

  const selectedShow = useMemo(
    () => shows.find((s) => s.id === showId) || null,
    [shows, showId],
  )

  const tiers = selectedShow?.tiers || []

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tickets/issue')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setShows(data.shows || [])
      setRecent(data.recent || [])
      if (!showId && data.shows?.[0]?.id) {
        setShowId(data.shows[0].id)
        setTierId(data.shows[0].tiers?.[0]?.id || '')
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load ticket tools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedShow) return
    if (!tiers.some((t) => t.id === tierId)) {
      setTierId(tiers[0]?.id || '')
    }
  }, [selectedShow, tiers, tierId])

  async function downloadOrderPdfs(orderId: string) {
    const res = await fetch(`/api/admin/tickets/${orderId}/pdf`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to generate PDFs')
    const files = data.files || []
    if (!files.length) throw new Error('No PDF files returned')
    for (const file of files) {
      downloadBase64Pdf(file.filename, file.contentBase64)
      // Stagger slightly so the browser doesn't coalesce downloads.
      await new Promise((r) => setTimeout(r, 120))
    }
    return files.length
  }

  async function sendOrderEmail(orderId: string) {
    const res = await fetch(`/api/admin/tickets/${orderId}/send`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send email')
  }

  async function issueTickets(e: React.FormEvent) {
    e.preventDefault()
    if (!showId || !email.trim()) {
      onError('Show and email are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/tickets/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          tierId,
          email: email.trim(),
          holderName: holderName.trim(),
          quantity,
          note: note.trim(),
          sendEmail,
          countAgainstInventory,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to issue tickets')

      const orderId = data.order?.id as string
      let msg = `Issued ${data.order.quantity} × ${data.order.tierName} for ${data.order.email}`

      if (data.email?.sent) msg += ' · emailed'
      else if (data.email?.skipped) msg += ' · email skipped (disabled in CMS)'
      else if (data.email?.error) msg += ` · email failed: ${data.email.error}`
      else if (!sendEmail) msg += ' · email not sent'

      if (downloadAfter && orderId) {
        const n = await downloadOrderPdfs(orderId)
        msg += ` · downloaded ${n} PDF${n === 1 ? '' : 's'}`
      }

      onMessage(msg)
      setHolderName('')
      setEmail('')
      setNote('')
      setQuantity(1)
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to issue tickets')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="admin-panel p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent-text)' }}
          >
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Issue tickets</h2>
            <p className="mt-1 text-sm text-white/50">
              Create complimentary / manual tickets for a holder, then email and/or download the PDFs.
              Issued tickets are scannable at the door.
            </p>
          </div>
        </div>

        <form onSubmit={issueTickets} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Show</label>
            <select
              className={inputClass}
              value={showId}
              onChange={(e) => setShowId(e.target.value)}
              disabled={loading || submitting}
              required
            >
              <option value="">Select a show…</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tier</label>
            <select
              className={inputClass}
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              disabled={!selectedShow || submitting}
              required
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.soldOut ? ' (sold out)' : ''}
                  {t.priceCents > 0 ? ` · ${formatPrice(t.priceCents, t.currency)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Quantity</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              disabled={submitting}
            />
          </div>

          <div>
            <label className={labelClass}>Ticket holder name</label>
            <input
              className={inputClass}
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Full name"
              disabled={submitting}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="holder@email.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Internal note (optional)</label>
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Press, guest list, VIP, etc."
              disabled={submitting}
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-2 text-sm text-white/70">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={submitting}
              />
              Send ticket email with PDF attachments
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={downloadAfter}
                onChange={(e) => setDownloadAfter(e.target.checked)}
                disabled={submitting}
              />
              Download ticket PDFs after issuing
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={countAgainstInventory}
                onChange={(e) => setCountAgainstInventory(e.target.checked)}
                disabled={submitting}
              />
              Count against show / tier inventory
            </label>
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
            <button type="submit" className={btnPrimary} disabled={submitting || loading}>
              <Ticket className="mr-2 inline h-4 w-4" />
              {submitting ? 'Issuing…' : 'Issue tickets'}
            </button>
            <button type="button" className={btnGhost} onClick={() => load()} disabled={loading}>
              <RefreshCw className="mr-2 inline h-4 w-4" />
              Refresh
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--admin-border-soft)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-white">Recently issued</h2>
            <p className="text-xs text-white/40">Manual / complimentary tickets</p>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-white/40">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/40">No manual tickets issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-white/35">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Holder</th>
                  <th className="px-5 py-3 font-medium">Show</th>
                  <th className="px-5 py-3 font-medium">Tickets</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => {
                  const d = row.show?.date ? formatShowDate(row.show.date) : null
                  return (
                    <tr
                      key={row.id}
                      style={{ borderTop: '1px solid var(--admin-border-soft)' }}
                    >
                      <td className="px-5 py-3 text-white/55">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString([], {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-white">
                          {row.holderName || row.email.split('@')[0]}
                        </div>
                        <div className="text-xs text-white/40">{row.email}</div>
                        {row.note ? (
                          <div className="mt-0.5 text-xs text-white/30">{row.note}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-white/70">
                        {row.show
                          ? `${row.show.city} · ${row.show.venue}${
                              d ? ` (${d.day} ${d.month})` : ''
                            }`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-white/70">
                        {row.quantity} × {row.tierName}
                      </td>
                      <td className="px-5 py-3 text-xs text-white/45">
                        {row.confirmationEmailSentAt ? 'Sent' : 'Not sent'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={btnSecondary}
                            disabled={busyId === row.id}
                            onClick={async () => {
                              setBusyId(row.id)
                              try {
                                await sendOrderEmail(row.id)
                                onMessage(`Ticket email sent to ${row.email}`)
                                await load()
                              } catch (err) {
                                onError(err instanceof Error ? err.message : 'Send failed')
                              } finally {
                                setBusyId(null)
                              }
                            }}
                          >
                            <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                            Send
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={busyId === row.id}
                            onClick={async () => {
                              setBusyId(row.id)
                              try {
                                const n = await downloadOrderPdfs(row.id)
                                onMessage(`Downloaded ${n} PDF${n === 1 ? '' : 's'}`)
                              } catch (err) {
                                onError(err instanceof Error ? err.message : 'Download failed')
                              } finally {
                                setBusyId(null)
                              }
                            }}
                          >
                            <Download className="mr-1.5 inline h-3.5 w-3.5" />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
