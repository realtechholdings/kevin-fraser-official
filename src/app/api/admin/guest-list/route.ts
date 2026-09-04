import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { isShowId, loadGuestList } from '@/lib/tickets/loadGuestList'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const showId = req.nextUrl.searchParams.get('showId') || ''
  if (!isShowId(showId)) {
    return NextResponse.json({ success: false, error: 'Show is required.' }, { status: 400 })
  }

  try {
    const data = await loadGuestList(showId)
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
      },
    })
  } catch (error) {
    console.error('Admin guest list GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load guest list.' }, { status: 500 })
  }
}
