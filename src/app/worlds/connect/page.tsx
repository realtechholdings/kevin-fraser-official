'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Send } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function ConnectPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-subtle)] focus:border-[var(--accent)]'

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="relative z-10 flex items-center justify-between border-b border-[var(--border)] py-4"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">Kevin Fraser</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center py-16"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <div className="mb-10 text-center">
            <div className="mb-4 text-5xl">🌐</div>
            <h1 className="mb-2 text-4xl font-black uppercase tracking-widest">Connect</h1>
            <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
              Contact · Subscribe · Inquire
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8">
            {success ? (
              <div className="py-8 text-center">
                <div className="mb-4 text-4xl">✉️</div>
                <h2 className="mb-3 text-xl font-black uppercase tracking-wider">Message Sent</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Kevin&apos;s team will be in touch soon. Thanks for reaching out!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setForm({ name: '', email: '', message: '' })
                  }}
                  className="mt-6 rounded-full border border-[var(--border)] px-6 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground-muted)]"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="mb-6 text-lg font-black uppercase tracking-widest">Get In Touch</h2>

                <input
                  type="text"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className={fieldClass}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className={fieldClass}
                />
                <textarea
                  placeholder="Your message..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                  rows={5}
                  className={`${fieldClass} resize-none`}
                />

                {error ? (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send size={14} /> Get In Touch
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs tracking-wide text-[var(--foreground-subtle)]">
            Mailing list · Social platforms · Business enquiries · Fan community
          </p>
        </motion.div>
      </main>
    </div>
  )
}
