'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Moon, Sun } from 'lucide-react'

export default function AdminHeader({
  title,
  subtitle,
  mode,
  onToggleMode,
}: {
  title: string
  subtitle: string
  mode: 'dark' | 'light'
  onToggleMode: () => void
}) {
  return (
    <header className="admin-header flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-white/90">{title}</h1>
        <p className="truncate text-xs" style={{ color: 'var(--admin-subtle)' }}>
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleMode}
          className="rounded-lg p-2 transition-colors"
          style={{ color: 'var(--admin-muted)' }}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link
          href="/"
          className="hidden rounded-lg px-3 py-2 text-xs transition-colors sm:inline"
          style={{ color: 'var(--admin-muted)' }}
        >
          Site
        </Link>
        <UserButton />
      </div>
    </header>
  )
}
