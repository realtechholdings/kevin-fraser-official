import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import ShowWaitlist from '@/lib/models/ShowWaitlist'
import { isShowArchived } from '@/lib/shows/archive'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { normalizeCheckoutEmail } from '@/lib/email/address'
import { sendWaitlistNotification } from '@/lib/email/waitlist'
import { emailConfigured } from '@/lib/email/resend'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Show not found.' }, { status: 404 })
    }
    const body = await req.json()
    const name = String(body.name || '').trim().replace(/\s+/g, ' ')
    const email = normalizeCheckoutEmail(body.email)
    if (name.length < 2) {
      return NextResponse.json({ success: false, error: 'Enter your name.' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 })
    }

    await dbConnect()
    const show = await Show.findById(id)
    if (!show || !show.published || isShowArchived(show) || !show.waitlistEnabled) {
      return NextResponse.json({ success: false, error: 'The waitlist is not open for this show.' }, { status: 400 })
    }

    const existing = await ShowWaitlist.findOne({ show: show._id, email })
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist for this show.",
      })
    }

    await ShowWaitlist.create({ show: show._id, name, email })

    if (emailConfigured()) {
      const date = formatShowDate(toWallIso(show.date) || String(show.date))
      try {
        await sendWaitlistNotification({
          name,
          email,
          city: show.city,
          venue: show.venue,
          dateLabel: date.full || '',
          host: (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0],
        })
      } catch (error) {
        console.error('Waitlist notify failed:', error)
      }
    }

    return NextResponse.json({ success: true, message: "You're on the waitlist. We'll be in touch if tickets open." })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ success: true, message: "You're already on the waitlist for this show." })
    }
    console.error('Show waitlist POST:', error)
    return NextResponse.json({ success: false, error: 'Could not join the waitlist.' }, { status: 500 })
  }
}
