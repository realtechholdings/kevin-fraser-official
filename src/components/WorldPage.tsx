'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

interface WorldPageProps {
  emoji: string
  title: string
  subtitle: string
  color: string
  neonClass: string
  description: string
  comingSoonItems?: string[]
}

export default function WorldPage({
  emoji,
  title,
  subtitle,
  color,
  neonClass,
  description,
  comingSoonItems = [],
}: WorldPageProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${color}15 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span className="font-black uppercase tracking-widest text-xs">Kevin Fraser</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl"
        >
          {/* Emoji */}
          <div
            className="text-6xl mb-6"
            style={{ filter: `drop-shadow(0 0 20px ${color})` }}
          >
            {emoji}
          </div>

          {/* Title */}
          <h1
            className={`text-4xl sm:text-5xl font-black uppercase tracking-widest mb-3 ${neonClass}`}
          >
            {title}
          </h1>

          <p className="text-gray-400 tracking-widest uppercase text-sm mb-8">{subtitle}</p>

          {/* Divider */}
          <div
            className="h-px w-24 mx-auto mb-8"
            style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
          />

          {/* Description */}
          <p className="text-gray-300 text-base leading-relaxed mb-12 max-w-lg mx-auto">
            {description}
          </p>

          {/* Coming Soon Card */}
          <div
            className="rounded-lg p-8 max-w-md mx-auto"
            style={{
              background: '#111',
              border: `1px solid ${color}33`,
              boxShadow: `0 0 30px ${color}11`,
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color }}
            >
              Coming Soon
            </div>

            {comingSoonItems.length > 0 ? (
              <ul className="space-y-3">
                {comingSoonItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Content dropping soon. Stay tuned.</p>
            )}

            <Link
              href="/"
              className="mt-6 inline-block px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all"
              style={{
                background: `${color}22`,
                border: `1px solid ${color}44`,
                color,
              }}
            >
              Back to All Worlds
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
