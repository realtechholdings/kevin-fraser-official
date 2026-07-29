import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const emails = (await Order.distinct('email', { status: 'paid' })) as string[]
    return NextResponse.json({ success: true, buyers: emails.sort(), count: emails.length })
  } catch (error) {
    console.error('CMS recipients GET:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load recipients.' },
      { status: 500 },
    )
  }
}
