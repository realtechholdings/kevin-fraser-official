import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { serializeShow } from '@/lib/serialize'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import ShowDetailClient from '@/components/stage/ShowDetailClient'
import EventJsonLd from '@/components/stage/EventJsonLd'
import { isShowArchived } from '@/lib/shows/archive'
import { applyTransferHolds, loadOpenTransferHolds } from '@/lib/tickets/transfers'
import { ensureShowSlugs, findShowByPublicKey } from '@/lib/shows/ensureShowSlug'
import { showPublicPath } from '@/lib/shows/publicPath'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  await dbConnect()
  const show = await findShowByPublicKey(id)
  if (!show || !show.published || isShowArchived(show)) {
    return { title: 'Show | Kevin Fraser Official' }
  }
  if (!show.slug) await ensureShowSlugs([show])
  return {
    title: `${show.city} · ${show.venue} | Kevin Fraser Official`,
    description: `Tickets for Kevin Fraser in ${show.city} at ${show.venue}.`,
    alternates: show.slug ? { canonical: showPublicPath(show) } : undefined,
  }
}

export default async function ShowDetailPage({ params }: Props) {
  const { id } = await params
  await dbConnect()
  const show = await findShowByPublicKey(id)
  if (!show || !show.published || isShowArchived(show)) notFound()
  if (!show.slug) await ensureShowSlugs([show])
  if (mongoose.isValidObjectId(id) && show.slug && show.slug !== id) {
    redirect(showPublicPath(show))
  }

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
