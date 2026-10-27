'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnGhost = 'admin-btn-ghost disabled:opacity-50'

type WaitShow = {
  id: string
  city: string
  venue: string
  dateLabel: string
  status: string
  waitlistEnabled: boolean
  archived: boolean
  count: number
}

type WaitEntry = {
  id: string
  name: string
  email: string
  createdAt: string | null
  showId: string
  city: string
  venue: string
}

export default function WaitlistAdminPanel({
  onError,
}: {
  onError: (message: string) => void
}) {
  const [shows, setShows] = useState<WaitShow[]>([])
  const [entries, setEntries] = useState<WaitEntry[]>([])
  const [showId, setShowId] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/waitlist')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load waitlists')
      setShows(data.shows || [])
      setEntries(data.entries || [])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load waitlists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(
    () => (showId === 'all' ? entries : entries.filter((entry) => entry.showId === showId)),
    [entries, showId],
  )
  const enabled = shows.filter((show) => show.waitlistEnabled && show.status === 'sold_out').length

  return (
    <div className="mt-10 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Waitlists</h3>
          <p className="mt-1 max-w-xl text-sm text-white/40">
            Sold-out shows with the waitlist switched on. {enabled} show{enabled === 1 ? '' : 's'}{' '}
            collecting names. New entries email tickets@kevinfraserofficial.com.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 inline h-4 w-4" />
            Refresh
          </button>
          <a
            className={btnSecondary}
            href={`/api/admin/waitlist?format=csv${showId !== 'all' ? `&showId=${showId}` : ''}`}
          >
            <Download className="mr-1.5 inline h-4 w-4" />
            Export CSV
          </a>
        </div>
      </div>
      <div className="max-w-md">
        <label className={labelClass} htmlFor="waitlist-show">
          Show
        </label>
        <select
          id="waitlist-show"
          className={inputClass}
          value={showId}
          onChange={(event) => setShowId(event.target.value)}
        >
          <option value="all">All shows ({entries.length})</option>
          {shows
            .filter((show) => show.count > 0 || (show.waitlistEnabled && show.status === 'sold_out'))
            .map((show) => (
              <option key={show.id} value={show.id}>
                {show.city} · {show.venue}
                {show.archived ? ' · Removed' : ''} · {show.count}
              </option>
            ))}
        </select>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Show</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-white/40">
                  {loading ? 'Loading…' : 'No waitlist entries yet.'}
                </td>
              </tr>
            ) : (
              visible.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-3 text-sm text-white">{entry.name}</td>
                  <td className="px-5 py-3 text-sm text-white/70">{entry.email}</td>
                  <td className="px-5 py-3 text-sm text-white/70">
                    {entry.city}
                    {entry.venue ? ` · ${entry.venue}` : ''}
                  </td>
                  <td className="px-5 py-3 text-sm text-white/50">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
