import type { Metadata } from 'next'
import StageTransferClient from '@/components/stage/StageTransferClient'

export const metadata: Metadata = {
  title: 'Transfer Tickets | Kevin Fraser Official',
}

type Props = {
  searchParams: Promise<{ order?: string; token?: string; cancelled?: string }>
}

export default async function StageTransferPage({ searchParams }: Props) {
  const params = await searchParams
  return (
    <StageTransferClient
      orderId={String(params.order || '').trim()}
      token={String(params.token || '').trim()}
      cancelled={params.cancelled === '1'}
    />
  )
}
