'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

const PARAGRAPHS = [
  'Kevin Fraser is a South African comedian, content creator, and professional observer of human behaviour. Especially the kind that happens at family gatherings, in traffic, and on WhatsApp voice notes that should have been texts.',
  'Known for his spot-on characters, relatable humour, and uncanny ability to say what everyone is thinking but is too polite to admit, Kevin has built a loyal following by turning everyday life into comedy gold. From relationships and parenting to culture, social dynamics, and the beautiful chaos of modern life, nothing is off limits if it\u2019s funny and true.',
  'Whether he\u2019s on stage, online, or behind a character that feels suspiciously familiar, Kevin\u2019s comedy is rooted in connection. The kind where you laugh, nod, and say, \u201CThat is exactly how it is.\u201D',
]

export default function AboutPageClient() {
  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between py-4">
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
        className="mx-auto w-full max-w-5xl pb-24 pt-10 sm:pt-16"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.35em]"
            style={{ color: 'var(--accent)' }}
          >
            Est. 1990
          </p>
          <h1
            className="mt-3 text-6xl uppercase leading-[0.9] sm:text-8xl"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            About
            <br />
            Kevin Fraser
          </h1>
        </motion.div>

        <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {PARAGRAPHS.map((text, i) => (
              <p
                key={i}
                className="text-base leading-relaxed text-[var(--foreground-muted)] sm:text-lg"
              >
                {text}
              </p>
            ))}
            <p
              className="pt-4 text-2xl uppercase leading-tight sm:text-3xl"
              style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
            >
              Welcome. You&rsquo;re among{' '}
              <span style={{ color: 'var(--accent)' }}>your people.</span>
            </p>
          </motion.div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] shadow-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/about-kevin-1.png"
                alt="Kevin Fraser performing on stage"
                className="aspect-[3/4] w-full object-cover"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 4 }}
              animate={{ opacity: 1, y: 0, rotate: 3 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="-mt-16 ml-auto w-3/4 overflow-hidden rounded-[1.5rem] border border-[var(--border)] shadow-2xl sm:-mt-24"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/about-kevin-2.png"
                alt="Kevin Fraser on stage in character"
                className="aspect-square w-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
