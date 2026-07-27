'use client'

import Link from 'next/link'
import { CalendarDays, Clapperboard, Film, LayoutDashboard, Ticket, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdminTab = 'overview' | 'tours' | 'shows' | 'bonus' | 'studio'

const nav: { id: AdminTab; name: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'tours', name: 'Tours', icon: Ticket },
  { id: 'shows', name: 'Shows', icon: CalendarDays },
  { id: 'bonus', name: 'Bonus Content', icon: Film },
  { id: 'studio', name: 'The Studio', icon: Clapperboard },
]

export default function AdminSidebar({
  tab,
  onTabChange,
}: {
  tab: AdminTab
  onTabChange: (tab: AdminTab) => void
}) {
  return (
    <aside className="admin-sidebar hidden h-full w-64 shrink-0 flex-col md:flex">
      <div
        className="flex h-16 items-center gap-3 px-5"
        style={{ borderBottom: '1px solid var(--admin-border-soft)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: 'var(--admin-violet-soft)', color: '#c4b5fd' }}
        >
          KF
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-white">Kevin Fraser</p>
          <p
            className="mt-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ color: 'rgba(52, 211, 153, 0.85)' }}
          >
            Admin Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {nav.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn('admin-nav-item', active && 'is-active')}
            >
              <item.icon
                className="h-4 w-4 shrink-0"
                style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}
              />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="space-y-2 px-3 py-5" style={{ borderTop: '1px solid var(--admin-border-soft)' }}>
        <Link
          href="/worlds/stage"
          className="admin-nav-item"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ExternalLink className="h-4 w-4" />
          View Stage
        </Link>
        <Link
          href="/worlds/showreel"
          className="admin-nav-item"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ExternalLink className="h-4 w-4" />
          View Showreel
        </Link>
        <Link
          href="/worlds/studio"
          className="admin-nav-item"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ExternalLink className="h-4 w-4" />
          View Studio
        </Link>
        <div className="flex items-center gap-2 px-3 pt-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
            Admin
          </span>
        </div>
      </div>
    </aside>
  )
}
