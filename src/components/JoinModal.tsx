'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

export default function JoinModal({ open, onClose }: JoinModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setError('')
    setName('')
    setEmail('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-lg p-8 relative"
            style={{
              background: '#111',
              border: '1px solid rgba(123,47,247,0.3)',
              boxShadow: '0 0 40px rgba(123,47,247,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {success ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-4">✨</div>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-3">
                  You&apos;re In!
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Welcome to the list, {name}. Kevin will be in touch with something special.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 text-xs font-bold uppercase tracking-widest rounded-sm"
                  style={{ background: 'linear-gradient(135deg, #7B2FF7, #5500cc)', color: '#fff' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                    Join The List
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Be first to know about events, drops, and Kevin&apos;s world.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      style={{ background: '#1A1A1A', border: '1px solid #333' }}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      style={{ background: '#1A1A1A', border: '1px solid #333' }}
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-sm font-bold uppercase tracking-widest rounded-sm transition-all disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #7B2FF7, #5500cc)',
                      color: '#fff',
                      boxShadow: '0 0 20px rgba(123,47,247,0.4)',
                    }}
                  >
                    {loading ? 'Joining...' : "I'm In"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
