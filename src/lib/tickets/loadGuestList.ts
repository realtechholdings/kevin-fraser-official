import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import '@/lib/models/Tour'
import { formatShowDate, formatShowTimeRange } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import {
  buildGuestListRows,
  type GuestListShowInfo,
} from '@/lib/tickets/guestListPdf'

export async function loadGuestList(showId: string) {
  await dbConnect()
  const show = await Show.findById(showId).populate('tour')
  if (!show) return null

  const orders = await Order.find({ show: showId, status: 'paid' }).sort({ createdAt: 1 })
  const date = toWallIso(show.date)
  const formatted = date ? formatShowDate(date) : null
  const tour =
    show.tour && typeof show.tour === 'object' && 'title' in show.tour
      ? String((show.tour as { title?: string }).title || '')
      : ''

  const info: GuestListShowInfo = {
    city: show.city,
    venue: show.venue,
    tour,
    dateLabel: formatted?.full || '',
    timeLabel: formatShowTimeRange(show.showTime, show.showEndTime) || show.showTime || '',
  }

  return {
    show: {
      id: String(show._id),
      ...info,
    },
    rows: buildGuestListRows(orders),
  }
}

export function isShowId(value: string) {
  return mongoose.isValidObjectId(value)
}
