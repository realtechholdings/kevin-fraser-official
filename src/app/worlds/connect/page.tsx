'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Send } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(155,89,182,0.12) 0%, transparent 60%)' }}
      />

      <header className="relative z-10 flex items-center px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} />
          <span className="font-black uppercase tracking-widest text-xs">Kevin Fraser</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-10">
            <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 20px #9B59B6)' }}>🌐</div>
            <h1 className="text-4xl font-black uppercase tracking-widest mb-2 neon-text-violet">Connect</h1>
            <p className="text-gray-400 text-sm tracking-widest">Contact · Social · Bookings</p>
          </div>

          <div
            className="rounded-lg p-8"
            style={{
              background: '#111',
              border: '1px solid rgba(155,89,182,0.3)',
              boxShadow: '0 0 30px rgba(155,89,182,0.1)',
            }}
          >
            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✉️</div>
                <h2 className="text-xl font-black uppercase tracking-wider text-white mb-3">Message Sent</h2>
                <p className="text-gray-400 text-sm">Kevin&apos;s team will be in touch soon. Thanks for reaching out!</p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name: '', email: '', message: '' }) }}
                  className="mt-6 px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-sm"
                  style={{ background: 'rgba(155,89,182,0.2)', border: '1px solid rgba(155,89,182,0.4)', color: '#9B59B6' }}
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-black uppercase tracking-widest text-white mb-6">Get In Touch</h2>

                <input
                  type="text"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: '#1A1A1A', border: '1px solid #333' }}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: '#1A1A1A', border: '1px solid #333' }}
                />
                <textarea
                  placeholder="Your message..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  style={{ background: '#1A1A1A', border: '1px solid #333' }}
                />

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest rounded-sm transition-all disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #9B59B6, #7700aa)',
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(155,89,182,0.4)',
                  }}
                >
                  {loading ? 'Sending...' : (<><Send size={14} /> Send Message</>)}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
