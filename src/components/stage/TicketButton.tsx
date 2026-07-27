'use client'

import { useState } from 'react'

type Props = {
  showId: string
  disabled?: boolean
  label?: string
  className?: string
}

export default function TicketButton({
  showId,
  disabled,
  label = 'Get Tickets',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkout() {
    if (disabled || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, quantity: 1 }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={checkout}
        disabled={disabled || loading}
        className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: disabled ? 'var(--surface-muted)' : 'var(--accent)',
          color: disabled ? 'var(--foreground-subtle)' : 'var(--accent-contrast)',
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
