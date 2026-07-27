'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default function AdminHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="admin-header flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
      <div>
        <h1 className="text-sm font-semibold text-white/90">{title}</h1>
        <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-3">
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
