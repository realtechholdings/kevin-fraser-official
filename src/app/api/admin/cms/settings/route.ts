import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import {
  DEFAULT_TICKET_BODY,
  DEFAULT_TICKET_SUBJECT,
  DEFAULT_UPGRADE_BODY,
  DEFAULT_UPGRADE_OFFER_BODY,
  DEFAULT_UPGRADE_OFFER_SUBJECT,
  DEFAULT_UPGRADE_SUBJECT,
  getEmailSettings,
} from '@/lib/models/EmailSettings'
import { emailConfigured, fromAddress } from '@/lib/email/resend'

function serializeSettings(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  return {
    signatureName: settings.signatureName,
    signatureTagline: settings.signatureTagline,
    signatureLinkUrl: settings.signatureLinkUrl,
    signatureImageUrl: settings.signatureImageUrl,
    ticketEmailEnabled: settings.ticketEmailEnabled !== false,
    ticketEmailSubject: settings.ticketEmailSubject || DEFAULT_TICKET_SUBJECT,
    ticketEmailBody: settings.ticketEmailBody || DEFAULT_TICKET_BODY,
    upgradeEmailEnabled: settings.upgradeEmailEnabled !== false,
    upgradeEmailSubject: settings.upgradeEmailSubject || DEFAULT_UPGRADE_SUBJECT,
    upgradeEmailBody: settings.upgradeEmailBody || DEFAULT_UPGRADE_BODY,
    upgradeOfferEmailEnabled: Boolean(settings.upgradeOfferEmailEnabled),
    upgradeOfferEmailSubject: settings.upgradeOfferEmailSubject || DEFAULT_UPGRADE_OFFER_SUBJECT,
    upgradeOfferEmailBody: settings.upgradeOfferEmailBody || DEFAULT_UPGRADE_OFFER_BODY,
    emailConfigured: emailConfigured(),
    fromAddress: fromAddress(),
  }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const settings = await getEmailSettings()
    return NextResponse.json({ success: true, settings: serializeSettings(settings) })
  } catch (error) {
    console.error('CMS settings GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load settings.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    await dbConnect()
    const settings = await getEmailSettings()

    if (body.signatureName !== undefined) settings.signatureName = String(body.signatureName)
    if (body.signatureTagline !== undefined) {
      settings.signatureTagline = String(body.signatureTagline)
    }
    if (body.signatureLinkUrl !== undefined) {
      settings.signatureLinkUrl = String(body.signatureLinkUrl)
    }
    if (body.signatureImageUrl !== undefined) {
      settings.signatureImageUrl = String(body.signatureImageUrl)
    }
    if (body.ticketEmailEnabled !== undefined) {
      settings.ticketEmailEnabled = Boolean(body.ticketEmailEnabled)
    }
    if (body.ticketEmailSubject !== undefined) {
      settings.ticketEmailSubject = String(body.ticketEmailSubject)
    }
    if (body.ticketEmailBody !== undefined) {
      settings.ticketEmailBody = String(body.ticketEmailBody)
    }
    if (body.upgradeEmailEnabled !== undefined) {
      settings.upgradeEmailEnabled = Boolean(body.upgradeEmailEnabled)
    }
    if (body.upgradeEmailSubject !== undefined) {
      settings.upgradeEmailSubject = String(body.upgradeEmailSubject)
    }
    if (body.upgradeEmailBody !== undefined) {
      settings.upgradeEmailBody = String(body.upgradeEmailBody)
    }
    if (body.upgradeOfferEmailEnabled !== undefined) {
      settings.upgradeOfferEmailEnabled = Boolean(body.upgradeOfferEmailEnabled)
    }
    if (body.upgradeOfferEmailSubject !== undefined) {
      settings.upgradeOfferEmailSubject = String(body.upgradeOfferEmailSubject)
    }
    if (body.upgradeOfferEmailBody !== undefined) {
      settings.upgradeOfferEmailBody = String(body.upgradeOfferEmailBody)
    }

    await settings.save()
    return NextResponse.json({ success: true, settings: serializeSettings(settings) })
  } catch (error) {
    console.error('CMS settings POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to save settings.' }, { status: 500 })
  }
}
