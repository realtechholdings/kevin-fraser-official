import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Show from '@/lib/models/Show'
// Registers the Tour schema for .populate('tour')
import '@/lib/models/Tour'
import { resolveTiersForShow } from '@/lib/tickets/resolveTiers'
import { sendTicketEmail } from '@/lib/email/ticket'

/** Send a sample ticket email (with PDF) so the admin can preview the template. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    if (!email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 })
    }

    await dbConnect()
    const show = body.showId
      ? await Show.findById(String(body.showId)).populate('tour')
      : await Show.findOne({ published: true, date: { $gte: new Date() } })
          .sort({ date: 1 })
          .populate('tour')

    if (!show) {
      return NextResponse.json(
        { success: false, error: 'No upcoming show found to preview with.' },
        { status: 404 },
      )
    }

    const tiers = await resolveTiersForShow(show)
    const tier = tiers[0]

    const result = await sendTicketEmail(
      {
        _id: 'TEST-PREVIEW',
        email,
        quantity: 2,
        amountTotal: (tier?.priceCents || show.priceCents) * 2,
        currency: tier?.currency || show.currency,
        tierName: tier?.name || 'General Admission',
      },
      show,
    )

    if (result.skipped) {
      return NextResponse.json(
        { success: false, error: 'Ticket email is disabled — enable it first.' },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (error) {
    console.error('CMS test-ticket POST:', error)
    const message = error instanceof Error ? error.message : 'Failed to send test.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
