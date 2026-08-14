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
  MessageCircle,
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
  | 'connect'
  | 'legal'
  | 'theme'
  | 'ai'

type NavItem = { id: AdminTab; name: string; icon: typeof LayoutDashboard }
type NavGroup = { label: string; items: NavItem[] }
type NavEntry = { type: 'item'; item: NavItem } | { type: 'group'; group: NavGroup }

const nav: NavEntry[] = [
  { type: 'item', item: { id: 'overview', name: 'Overview', icon: LayoutDashboard } },
  { type: 'item', item: { id: 'tours', name: 'Tours', icon: Ticket } },
  { type: 'item', item: { id: 'shows', name: 'Shows', icon: CalendarDays } },
  { type: 'item', item: { id: 'sales', name: 'Sales', icon: BadgeDollarSign } },
  { type: 'item', item: { id: 'cms', name: 'CMS', icon: Mail } },
  {
    type: 'group',
    group: {
      label: 'Ticketing',
      items: [
        { id: 'tiers', name: 'Ticket Tiers', icon: Layers },
        { id: 'scanner', name: 'Ticket Scanner', icon: ScanLine },
      ],
    },
  },
  {
    type: 'group',
    group: {
      label: 'Website',
      items: [
        { id: 'bonus', name: 'Showreel', icon: Film },
        { id: 'studio', name: 'The Studio', icon: Clapperboard },
        { id: 'kevin11', name: 'Kevin11', icon: Store },
        { id: 'connect', name: 'Connect', icon: MessageCircle },
        { id: 'legal', name: 'Terms & Policies', icon: ScrollText },
        { id: 'theme', name: 'Theme', icon: Palette },
        { id: 'ai', name: 'AI Kev', icon: Bot },
      ],
    },
  },
]

function NavButton({
  item,
  active,
  onTabChange,
  nested,
}: {
  item: NavItem
  active: boolean
  onTabChange: (tab: AdminTab) => void
  nested?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onTabChange(item.id)}
      className={cn('admin-nav-item', active && 'is-active', nested && 'pl-3')}
    >
      <item.icon
        className="h-4 w-4 shrink-0"
        style={{ color: active ? 'var(--admin-accent-text)' : 'var(--admin-subtle)' }}
      />
      <span>{item.name}</span>
    </button>
  )
}

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
        {nav.map((entry) => {
          if (entry.type === 'item') {
            return (
              <NavButton
                key={entry.item.id}
                item={entry.item}
                active={tab === entry.item.id}
                onTabChange={onTabChange}
              />
            )
          }

          return (
            <div key={entry.group.label} className="pt-4 first:pt-0">
              <p
                className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: 'var(--admin-subtle)' }}
              >
                {entry.group.label}
              </p>
              <div className="space-y-1">
                {entry.group.items.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={tab === item.id}
                    onTabChange={onTabChange}
                    nested
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
