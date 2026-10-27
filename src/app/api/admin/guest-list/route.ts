import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { isShowId, loadGuestList, parseGuestListQuery } from '@/lib/tickets/loadGuestList'

export const runtime = 'nodejs'
export const maxDuration = 60

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

    const tickets = data.rows.reduce((sum, row) => sum + row.quantity, 0)
    return NextResponse.json({
      success: true,
      show: data.show,
      guests: data.rows,
      totals: {
        guests: data.rows.length,
        tickets,
        comps: data.rows.filter((row) => row.source === 'comp').length,
        allGuests: data.totalGuests,
      },
    })
  } catch (error) {
    console.error('Admin guest list GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load guest list.' }, { status: 500 })
  }
}
