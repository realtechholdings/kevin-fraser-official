import type { Metadata } from 'next'
import dbConnect from '@/lib/db'
import Tour from '@/lib/models/Tour'
import Show from '@/lib/models/Show'
import { serializeShow, serializeTour } from '@/lib/serialize'
import { resolveTiersForShows } from '@/lib/tickets/resolveTiers'
import StagePageClient from '@/components/stage/StagePageClient'

export const metadata: Metadata = {
  title: 'The Stage | Kevin Fraser Official',
  description: 'Upcoming shows, tours, and tickets for Kevin Fraser.',
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ cancelled?: string; tour?: string }>
}

export default async function StagePage({ searchParams }: Props) {
  const params = await searchParams
  await dbConnect()

  const [tours, shows] = await Promise.all([
    Tour.find({ published: true }).sort({ featured: -1, startDate: 1 }),
    Show.find({
      published: true,
      date: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    })
      .populate('tour')
      .sort({ date: 1 }),
  ])

  const tiersByShow = await resolveTiersForShows(shows)
  const publicShows = shows.map((show) => serializeShow(show, tiersByShow[String(show._id)] || []))

  return (
    <StagePageClient
      tours={tours.map(serializeTour)}
      shows={publicShows}
      cancelled={params.cancelled === '1'}
      tourSlug={params.tour || null}
    />
  )
}
