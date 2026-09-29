import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import {
  guestListCsv,
  guestListFilterNote,
  isShowId,
  loadGuestList,
  parseGuestListQuery,
} from '@/lib/tickets/loadGuestList'
import { slugify } from '@/lib/format'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin('guestlist')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const showId = req.nextUrl.searchParams.get('showId') || ''
  if (!isShowId(showId)) {
    return NextResponse.json({ success: false, error: 'Show is required.' }, { status: 400 })
  }

  try {
    const query = parseGuestListQuery(req.nextUrl.searchParams)
    const data = await loadGuestList(showId, query)
    if (!data) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }

    const csv = guestListCsv(data.show, data.rows)
    const note = guestListFilterNote(query)
    const filename = note ? csv.filename.replace(/\.csv$/, `-${slugify(note)}.csv`) : csv.filename
    return new NextResponse(csv.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Admin guest list CSV GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to export guest list.' }, { status: 500 })
  }
}
