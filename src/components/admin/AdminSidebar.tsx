'use client'

import {
  BadgeDollarSign,
  Bot,
  CalendarDays,
  Clapperboard,
  Film,
  Layers,
  LayoutDashboard,
  Mail,
  Palette,
  ScanLine,
  ScrollText,
  Store,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdminTab =
  | 'overview'
  | 'tours'
  | 'shows'
  | 'tiers'
  | 'sales'
  | 'cms'
  | 'scanner'
  | 'bonus'
  | 'studio'
  | 'kevin11'
  | 'legal'
  | 'theme'
  | 'ai'

const nav: { id: AdminTab; name: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'tours', name: 'Tours', icon: Ticket },
  { id: 'shows', name: 'Shows', icon: CalendarDays },
  { id: 'tiers', name: 'Ticket Tiers', icon: Layers },
  { id: 'sales', name: 'Sales', icon: BadgeDollarSign },
  { id: 'cms', name: 'CMS', icon: Mail },
  { id: 'scanner', name: 'Ticket Scanner', icon: ScanLine },
  { id: 'bonus', name: 'Bonus Content', icon: Film },
  { id: 'studio', name: 'The Studio', icon: Clapperboard },
  { id: 'kevin11', name: 'Kevin11', icon: Store },
  { id: 'legal', name: 'Terms & Policies', icon: ScrollText },
  { id: 'theme', name: 'Theme', icon: Palette },
  { id: 'ai', name: 'AI Kev', icon: Bot },
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
          style={{ background: 'var(--admin-accent-soft)', color: 'var(--admin-accent-text)' }}
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
                style={{ color: active ? 'var(--admin-accent-text)' : 'var(--admin-subtle)' }}
              />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
