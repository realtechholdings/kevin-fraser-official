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
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0D0D16]/80 px-4 backdrop-blur-sm sm:px-6">
      <div>
        <h1 className="text-sm font-semibold text-white/90">{title}</h1>
        <p className="text-xs text-white/30">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="hidden rounded-lg px-3 py-2 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 sm:inline"
        >
          Site
        </Link>
        <UserButton />
      </div>
    </header>
  )
}
