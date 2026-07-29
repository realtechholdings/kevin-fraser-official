import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { getEmailSettings } from '@/lib/models/EmailSettings'
import { emailConfigured, fromAddress } from '@/lib/email/resend'

function serializeSettings(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  return {
    signatureName: settings.signatureName,
    signatureTagline: settings.signatureTagline,
    signatureLinkUrl: settings.signatureLinkUrl,
    signatureImageUrl: settings.signatureImageUrl,
    ticketEmailEnabled: settings.ticketEmailEnabled,
    ticketEmailSubject: settings.ticketEmailSubject,
    ticketEmailBody: settings.ticketEmailBody,
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

    await settings.save()
    return NextResponse.json({ success: true, settings: serializeSettings(settings) })
  } catch (error) {
    console.error('CMS settings POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to save settings.' }, { status: 500 })
  }
}
