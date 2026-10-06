'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { CORPORATE_EVENT_TYPES } from '@/lib/email/corporateBooking'

const fieldClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]'

const labelClass =
  'mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]'

type FormState = {
  name: string
  email: string
  company: string
  eventType: string
  date: string
  city: string
  audienceSize: string
  budget: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  company: '',
  eventType: CORPORATE_EVENT_TYPES[0],
  date: '',
  city: '',
  audienceSize: '',
  budget: '',
  notes: '',
}

export default function CorporateBookingsClient() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/corporate-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            <span
              className="text-xs uppercase tracking-[0.22em]"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Kevin Fraser
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-3xl pb-24 pt-10 sm:pt-14"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <p className="mb-3 text-[11px] uppercase tracking-[0.35em]" style={{ color: 'var(--accent)' }}>
          Company events
        </p>
        <h1
          className="text-5xl uppercase leading-[0.92] sm:text-7xl"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          Corporate bookings
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
          Tell us about the event and Kevin’s team will come back to you. Conferences, launches,
          private functions, and brand work.
        </p>

        <section className="mt-10 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-8">
          {success ? (
            <div className="py-10 text-center">
              <p className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
                Sent
              </p>
              <h2
                className="mb-3 text-3xl uppercase"
                style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
              >
                Enquiry received
              </h2>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--foreground-muted)]">
                Thanks. We’ll reply to the email address you entered.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false)
                  setForm(emptyForm)
                }}
                className="mt-8 rounded-full border border-[var(--border)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="booking-name">
                    Name
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="booking-email">
                    Email
                  </label>
                  <input
                    id="booking-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="booking-company">
                  Company
                </label>
                <input
                  id="booking-company"
                  type="text"
                  autoComplete="organization"
                  value={form.company}
                  onChange={(event) => setField('company', event.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="booking-type">
                    Event type
                  </label>
                  <select
                    id="booking-type"
                    required
                    value={form.eventType}
                    onChange={(event) => setField('eventType', event.target.value)}
                    className={fieldClass}
                  >
                    {CORPORATE_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="booking-date">
                    Date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => setField('date', event.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="booking-city">
                    City
                  </label>
                  <input
                    id="booking-city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(event) => setField('city', event.target.value)}
                    className={fieldClass}
                    placeholder="Sydney"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="booking-audience">
                    Audience size
                  </label>
                  <input
                    id="booking-audience"
                    type="number"
                    required
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={form.audienceSize}
                    onChange={(event) => setField('audienceSize', event.target.value)}
                    className={fieldClass}
                    placeholder="200"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="booking-budget">
                  Budget
                </label>
                <input
                  id="booking-budget"
                  type="text"
                  required
                  value={form.budget}
                  onChange={(event) => setField('budget', event.target.value)}
                  className={fieldClass}
                  placeholder="AUD 15,000"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="booking-notes">
                  Anything else
                </label>
                <textarea
                  id="booking-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  className={`${fieldClass} resize-none`}
                  placeholder="Venue, timing, or what you want from the set."
                />
              </div>

              {error ? (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.16em] disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                {loading ? (
                  'Sending…'
                ) : (
                  <>
                    <Send size={14} /> Send enquiry
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
