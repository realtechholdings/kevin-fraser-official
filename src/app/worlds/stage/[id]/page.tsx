import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { serializeShow } from '@/lib/serialize'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import ShowDetailClient from '@/components/stage/ShowDetailClient'
import EventJsonLd from '@/components/stage/EventJsonLd'
import { isShowArchived } from '@/lib/shows/archive'
import { applyTransferHolds, loadOpenTransferHolds } from '@/lib/tickets/transfers'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  await dbConnect()
  const show = await Show.findById(id).populate('tour')
  if (!show || !show.published || isShowArchived(show)) {
    return { title: 'Show | Kevin Fraser Official' }
  }
  return {
    title: `${show.city} · ${show.venue} | Kevin Fraser Official`,
    description: `Tickets for Kevin Fraser in ${show.city} at ${show.venue}.`,
  }
}

export default async function ShowDetailPage({ params }: Props) {
  const { id } = await params
  await dbConnect()
  const show = await Show.findById(id).populate('tour')
  if (!show || !show.published || isShowArchived(show)) notFound()

  const resolvedTiers = await resolveTiersForShow(show)
  const transferHolds = await loadOpenTransferHolds([String(show._id)])
  const held = applyTransferHolds(resolvedTiers, transferHolds.get(String(show._id)))
  const publicShow = serializeShow(show, held.tiers)
  publicShow.ticketsSold += held.heldSeats

  return (
    <>
      <EventJsonLd show={publicShow} />
      <ShowDetailClient show={publicShow} />
    </>
  )
}
