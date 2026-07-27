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
        className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled ? '#333' : '#FF6B35',
          color: disabled ? '#888' : '#0A0A0A',
          boxShadow: disabled ? 'none' : '0 0 24px rgba(255,107,53,0.35)',
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
