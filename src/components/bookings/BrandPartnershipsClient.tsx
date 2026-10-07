'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Send } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import {
  PARTNERSHIP_CHANNELS,
  PARTNERSHIP_TYPES,
  type PartnershipChannel,
} from '@/lib/email/brandPartnership'

const fieldClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]'

const labelClass =
  'mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-[var(--foreground-subtle)]'

type FormState = {
  name: string
  email: string
  brand: string
  role: string
  website: string
  partnershipType: string
  channels: PartnershipChannel[]
  timeline: string
  budget: string
  brief: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  brand: '',
  role: '',
  website: '',
  partnershipType: PARTNERSHIP_TYPES[0],
  channels: [],
  timeline: '',
  budget: '',
  brief: '',
}

export default function BrandPartnershipsClient() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleChannel(channel: PartnershipChannel) {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((c) => c !== channel)
        : [...current.channels, channel],
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/brand-partnerships', {
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
          Work with Kevin
        </p>
        <h1
          className="text-5xl uppercase leading-[0.92] sm:text-7xl"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          Brands &amp; partnerships
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--foreground-muted)]">
          Sponsored content, ambassador deals, product placement, activations, and collabs. Send
          the brief and Kevin’s team will come back to you.
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
                Brief received
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
                  <label className={labelClass} htmlFor="partner-name">
                    Name
                  </label>
                  <input
                    id="partner-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="partner-email">
                    Email
                  </label>
                  <input
                    id="partner-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="partner-brand">
                    Brand / company
                  </label>
                  <input
                    id="partner-brand"
                    type="text"
                    required
                    autoComplete="organization"
                    value={form.brand}
                    onChange={(event) => setField('brand', event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="partner-role">
                    Your role
                  </label>
                  <input
                    id="partner-role"
                    type="text"
                    autoComplete="organization-title"
                    value={form.role}
                    onChange={(event) => setField('role', event.target.value)}
                    className={fieldClass}
                    placeholder="Marketing lead, agency, founder…"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="partner-website">
                  Website or social link
                </label>
                <input
                  id="partner-website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={form.website}
                  onChange={(event) => setField('website', event.target.value)}
                  className={fieldClass}
                  placeholder="yourbrand.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="partner-type">
                    Partnership type
                  </label>
                  <select
                    id="partner-type"
                    required
                    value={form.partnershipType}
                    onChange={(event) => setField('partnershipType', event.target.value)}
                    className={fieldClass}
                  >
                    {PARTNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="partner-timeline">
                    Timeline
                  </label>
                  <input
                    id="partner-timeline"
                    type="text"
                    value={form.timeline}
                    onChange={(event) => setField('timeline', event.target.value)}
                    className={fieldClass}
                    placeholder="Q1 2027, or a launch date"
                  />
                </div>
              </div>

              <fieldset>
                <legend className={labelClass}>Channels</legend>
                <div className="flex flex-wrap gap-2">
                  {PARTNERSHIP_CHANNELS.map((channel) => {
                    const active = form.channels.includes(channel)
                    return (
                      <button
                        key={channel}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleChannel(channel)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors"
                        style={
                          active
                            ? {
                                borderColor: 'var(--accent)',
                                background: 'var(--accent)',
                                color: 'var(--accent-contrast)',
                              }
                            : {
                                borderColor: 'var(--border)',
                                background: 'var(--background)',
                                color: 'var(--foreground-muted)',
                              }
                        }
                      >
                        {active ? <Check size={12} /> : null}
                        {channel}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div>
                <label className={labelClass} htmlFor="partner-budget">
                  Budget
                </label>
                <input
                  id="partner-budget"
                  type="text"
                  required
                  value={form.budget}
                  onChange={(event) => setField('budget', event.target.value)}
                  className={fieldClass}
                  placeholder="AUD 20,000"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="partner-brief">
                  The brief
                </label>
                <textarea
                  id="partner-brief"
                  required
                  rows={5}
                  value={form.brief}
                  onChange={(event) => setField('brief', event.target.value)}
                  className={`${fieldClass} resize-none`}
                  placeholder="What the campaign is, deliverables you have in mind, and what success looks like."
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
                    <Send size={14} /> Send brief
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
