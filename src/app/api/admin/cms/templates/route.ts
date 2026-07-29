import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import EmailTemplate from '@/lib/models/EmailTemplate'

function serialize(template: InstanceType<typeof EmailTemplate>) {
  return {
    id: String(template._id),
    name: template.name,
    subject: template.subject,
    body: template.body,
    updatedAt: new Date(template.updatedAt).toISOString(),
  }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const templates = await EmailTemplate.find().sort({ updatedAt: -1 })
    return NextResponse.json({ success: true, templates: templates.map(serialize) })
  } catch (error) {
    console.error('CMS templates GET:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load templates.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    const subject = String(body.subject || '').trim()
    const templateBody = String(body.body || '')

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { success: false, error: 'Name, subject, and body are required.' },
        { status: 400 },
      )
    }

    await dbConnect()

    if (body.id) {
      const existing = await EmailTemplate.findById(String(body.id))
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
      }
      existing.name = name
      existing.subject = subject
      existing.body = templateBody
      await existing.save()
      return NextResponse.json({ success: true, template: serialize(existing) })
    }

    const created = await EmailTemplate.create({ name, subject, body: templateBody })
    return NextResponse.json({ success: true, template: serialize(created) }, { status: 201 })
  } catch (error) {
    console.error('CMS templates POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to save template.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Template id is required.' }, { status: 400 })
    }
    await dbConnect()
    await EmailTemplate.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CMS templates DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete template.' },
      { status: 500 },
    )
  }
}
