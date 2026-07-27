'use client'

import Link from 'next/link'
import { CalendarDays, LayoutDashboard, Ticket, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'tours' | 'shows'

const nav: { id: Tab; name: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'tours', name: 'Tours', icon: Ticket },
  { id: 'shows', name: 'Shows', icon: CalendarDays },
]

export default function AdminSidebar({
  tab,
  onTabChange,
}: {
  tab: Tab
  onTabChange: (tab: Tab) => void
}) {
  return (
    <aside className="hidden md:flex h-full w-60 flex-col border-r border-white/5 bg-[#0D0D16]">
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-bold text-violet-300">
          KF
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-white">Kevin Fraser</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400/80">
            Admin Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  active ? 'text-violet-400' : 'text-white/30 group-hover:text-white/50'
                )}
              />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-white/5 px-3 py-4">
        <Link
          href="/worlds/stage"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
        >
          <ExternalLink className="h-4 w-4" />
          View Stage
        </Link>
        <div className="flex items-center gap-2 px-3 pt-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs text-white/30">Admin</span>
        </div>
      </div>
    </aside>
  )
}
