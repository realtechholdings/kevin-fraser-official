import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { getEmailSettings } from '@/lib/models/EmailSettings'
import { appUrl } from '@/lib/stripe'
import { renderEmailHtml, substituteTemplate, textToEmailHtml } from '@/lib/email/branding'
import { sendEmail } from '@/lib/email/resend'

const MAX_RECIPIENTS = 500

export async function POST(req: NextRequest) {
  const admin = await requireAdmin('cms')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const subject = String(body.subject || '').trim()
    const message = String(body.body || '').trim()
    const audience =
      body.audience === 'buyers' || body.audience === 'holders' ? body.audience : 'custom'
    const includeSignature = body.includeSignature !== false

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and body are required.' },
        { status: 400 },
      )
    }

    await dbConnect()

    let recipients: string[] = []
    if (audience === 'buyers') {
      recipients = (await Order.distinct('email', { status: 'paid' })) as string[]
    } else if (audience === 'holders') {
      const showId = String(body.showId || '').trim()
      const tierName = String(body.tierName || '').trim()
      if (!showId) {
        return NextResponse.json({ success: false, error: 'Select a show.' }, { status: 400 })
      }
      const filter: Record<string, unknown> = { status: 'paid', show: showId }
      if (tierName) filter.tierName = tierName
      recipients = (await Order.distinct('email', filter)) as string[]
    } else {
      recipients = String(body.to || '')
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'))
    }
    recipients = Array.from(new Set(recipients))

    if (!recipients.length) {
      return NextResponse.json({ success: false, error: 'No recipients.' }, { status: 400 })
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          success: false,
          error: `That group has ${recipients.length} people. Narrow it to ${MAX_RECIPIENTS} or fewer, or send in batches.`,
        },
        { status: 400 },
      )
    }

    const settings = await getEmailSettings()
    const signature = includeSignature
      ? {
          name: settings.signatureName,
          tagline: settings.signatureTagline,
          linkUrl: settings.signatureLinkUrl,
          imageUrl: settings.signatureImageUrl,
        }
      : null

    let sent = 0
    const errors: string[] = []
    for (const email of recipients) {
      const vars = { name: email.split('@')[0], email }
      try {
        await sendEmail({
          to: [email],
          subject: substituteTemplate(subject, vars),
          text: substituteTemplate(message, vars),
          html: renderEmailHtml({
            bodyHtml: textToEmailHtml(substituteTemplate(message, vars)),
            signature,
            appUrl: appUrl(),
          }),
        })
        sent++
      } catch (err) {
        errors.push(`${email}: ${err instanceof Error ? err.message : 'send failed'}`)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      sent,
      failed: errors.length,
      errors: errors.slice(0, 5),
    })
  } catch (error) {
    console.error('CMS send POST:', error)
    const message = error instanceof Error ? error.message : 'Failed to send.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
