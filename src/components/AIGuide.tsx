'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageCircle } from 'lucide-react'
import { DEFAULT_AI_SETTINGS, contrastInkForHex } from '@/lib/settings/defaults'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type PublicAI = {
  displayName: string
  launcherLabel: string
  launcherColor: string
  greeting: string
  avatarUrl: string
}

export default function AIGuide() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [ai, setAi] = useState<PublicAI>({
    displayName: DEFAULT_AI_SETTINGS.displayName,
    launcherLabel: DEFAULT_AI_SETTINGS.launcherLabel,
    launcherColor: DEFAULT_AI_SETTINGS.launcherColor,
    greeting: DEFAULT_AI_SETTINGS.greeting,
    avatarUrl: '',
  })
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: DEFAULT_AI_SETTINGS.greeting },
  ])
  const [booted, setBooted] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (!res.ok || !data.success || cancelled) return
        const next: PublicAI = {
          displayName: data.ai?.displayName || DEFAULT_AI_SETTINGS.displayName,
          launcherLabel: String(data.ai?.launcherLabel ?? DEFAULT_AI_SETTINGS.launcherLabel).trim(),
          launcherColor: String(data.ai?.launcherColor || '').trim(),
          greeting: data.ai?.greeting || DEFAULT_AI_SETTINGS.greeting,
          avatarUrl: data.ai?.avatarUrl || '',
        }
        setAi(next)
        setMessages((prev) => {
          if (booted || prev.length > 1) return prev
          return [{ role: 'assistant', content: next.greeting }]
        })
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setBooted(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    ;(window as unknown as { __openAIGuide?: () => void }).__openAIGuide = () => setOpen(true)
    return () => {
      delete (window as unknown as { __openAIGuide?: () => void }).__openAIGuide
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }] }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content || ''
                assistantMsg += delta
                setMessages((prev) => {
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { role: 'assistant', content: assistantMsg }
                  return newMsgs
                })
              } catch {
                // ignore partial SSE chunks
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Try again in a moment!' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (pathname?.startsWith('/admin')) return null

  const customLauncher = /^#[0-9a-fA-F]{6}$/i.test(ai.launcherColor)
  const accent = customLauncher ? ai.launcherColor : 'var(--accent)'
  const accentContrast = customLauncher
    ? contrastInkForHex(ai.launcherColor)
    : 'var(--accent-contrast)'
  const buttonShadow = customLauncher
    ? `0 8px 24px ${ai.launcherColor}59`
    : '0 8px 24px color-mix(in srgb, var(--accent) 35%, transparent)'

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-4 z-50 flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            style={{
              width: 'min(320px, calc(100vw - 2rem))',
              height: '420px',
            }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{ background: accent, color: accentContrast }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-black/15 text-sm">
                  {ai.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ai.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    '🎭'
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase">{ai.displayName}</p>
                  <p className="text-[10px] opacity-80">AI Guide</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-hide">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed"
                    style={
                      msg.role === 'user'
                        ? { background: accent, color: accentContrast }
                        : {
                            background: 'var(--surface-muted)',
                            color: 'var(--foreground)',
                            border: '1px solid var(--border)',
                          }
                    }
                  >
                    {msg.content || (loading && i === messages.length - 1 ? '...' : '')}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div
              className="flex shrink-0 items-center gap-2 px-3 py-3"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="disabled:opacity-40"
                style={{ color: accent }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 overflow-hidden rounded-full pr-1"
        style={{
          background: accent,
          color: accentContrast,
          boxShadow: buttonShadow,
          paddingLeft: open || !ai.launcherLabel.trim() ? 0 : '0.75rem',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={ai.launcherLabel.trim() || 'Open AI Guide'}
      >
        {!open && ai.launcherLabel.trim() ? (
          <span className="max-w-[9.5rem] truncate pl-1 text-left text-[11px] font-semibold leading-tight tracking-wide">
            {ai.launcherLabel.trim()}
          </span>
        ) : null}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {open ? (
            <X size={18} />
          ) : ai.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ai.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MessageCircle size={18} />
          )}
        </span>
      </motion.button>
    </>
  )
}
