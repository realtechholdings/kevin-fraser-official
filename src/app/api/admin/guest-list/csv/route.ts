import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { attachmentResponse } from '@/lib/http/attachment'
import { slugify } from '@/lib/format'
import { doorStaffShowError } from '@/lib/tickets/doorAccess'
import {
  guestListCsv,
  guestListFilterNote,
  isShowId,
  loadGuestList,
  parseGuestListQuery,
} from '@/lib/tickets/loadGuestList'

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

  const doorError = await doorStaffShowError(admin.access.permissions, showId)
  if (doorError) {
    return NextResponse.json({ success: false, error: doorError }, { status: 403 })
  }

  try {
    const query = parseGuestListQuery(req.nextUrl.searchParams)
    const data = await loadGuestList(showId, query)
    if (!data) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }

    const csv = guestListCsv(data.show, data.rows, {
      group: query.group,
      classOrder: data.classOrder,
    })
    const note = guestListFilterNote(query)
    const filename = note ? csv.filename.replace(/\.csv$/, `-${slugify(note)}.csv`) : csv.filename
    return attachmentResponse(csv.body, 'text/csv; charset=utf-8', filename)
  } catch (error) {
    console.error('Admin guest list CSV GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to export guest list.' }, { status: 500 })
  }
}
