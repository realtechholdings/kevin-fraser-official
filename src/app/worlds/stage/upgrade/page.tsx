import type { Metadata } from 'next'
import Link from 'next/link'
import StageUpgradeClient from '@/components/stage/StageUpgradeClient'

export const metadata: Metadata = {
  title: 'Upgrade Tickets | Kevin Fraser Official',
}

type Props = {
  searchParams: Promise<{ order?: string; token?: string; cancelled?: string }>
}

export default async function StageUpgradePage({ searchParams }: Props) {
  const params = await searchParams
  const orderId = String(params.order || '').trim()
  const token = String(params.token || '').trim()
  const cancelled = params.cancelled === '1'

  if (!orderId || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="w-full max-w-md rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-12 text-center">
          <h1
            className="text-4xl uppercase text-[var(--foreground)]"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            Upgrade tickets
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Open the link from your ticket email to upgrade. You’ll need the tickets you already
            bought.
          </p>
          <Link
            href="/worlds/stage"
            className="mt-8 inline-flex rounded-full px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Back to shows
          </Link>
        </div>
      </div>
    )
  }

  return <StageUpgradeClient orderId={orderId} token={token} cancelled={cancelled} />
}
