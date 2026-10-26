'use client'

import { useState } from 'react'

export default function WaitlistForm({
  showId,
  compact = false,
}: {
  showId: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/shows/${showId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not join the waitlist.')
      setMessage(data.message || "You're on the waitlist.")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the waitlist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="waitlist" className={compact ? '' : 'mt-4'}>
      {message ? (
        <p className="text-sm text-[var(--foreground)]">{message}</p>
      ) : open ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-2">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            {busy ? 'Joining…' : 'Join waitlist'}
          </button>
          {error ? (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]"
        >
          Join waitlist
        </button>
      )}
    </div>
  )
}
