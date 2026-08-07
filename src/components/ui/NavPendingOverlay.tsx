'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Full-screen pending state for client navigations that feel slow. */
export function NavPendingOverlay({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#FF6600',
            borderRightColor: 'rgba(255,102,0,0.35)',
          }}
        />
        <p
          className="text-[11px] uppercase tracking-[0.28em] text-white/75"
          style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}

/**
 * Track an in-flight client navigation and clear when the pathname changes.
 */
export function usePendingNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setPending(false)
  }, [pathname])

  function navigate(href: string) {
    if (!href || pending) return
    if (href === pathname) return
    setPending(true)
    router.push(href)
  }

  function markPending() {
    setPending(true)
  }

  return { pending, navigate, markPending }
}
