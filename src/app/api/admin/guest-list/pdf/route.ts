import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { isShowId, loadGuestList } from '@/lib/tickets/loadGuestList'
import { generateGuestListPdf } from '@/lib/tickets/guestListPdf'

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

    const pdf = await generateGuestListPdf(data.show, data.rows)
    return new NextResponse(Buffer.from(pdf.bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdf.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Admin guest list PDF GET:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate guest list.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
