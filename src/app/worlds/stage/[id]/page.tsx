import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { serializeShow } from '@/lib/serialize'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import ShowDetailClient from '@/components/stage/ShowDetailClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  await dbConnect()
  const show = await Show.findById(id).populate('tour')
  if (!show || !show.published) {
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
  if (!show || !show.published) notFound()

  const tiers = await resolveTiersForShow(show)
  const publicShow = serializeShow(show, tiers)

  return <ShowDetailClient show={publicShow} />
}
