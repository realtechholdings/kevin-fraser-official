import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import TicketTable from '@/lib/models/TicketTable'
import { serializeTicketTable } from '@/lib/tickets/tables'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    await dbConnect()
    const tables = await TicketTable.find().sort({ show: 1, sortOrder: 1, name: 1 })
    return NextResponse.json({
      success: true,
      tables: tables.map(serializeTicketTable),
    })
  } catch (error) {
    console.error('Admin tables GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load tables.' }, { status: 500 })
  }
}
