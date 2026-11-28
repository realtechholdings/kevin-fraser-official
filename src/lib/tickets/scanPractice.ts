import type mongoose from 'mongoose'
import QRCode from 'qrcode'
import dbConnect from '../db'
import Admission from '../models/Admission'
import Order from '../models/Order'
import Show from '../models/Show'
import Tour from '../models/Tour'
import { isScanPracticeShow } from '../shows/archive'

/** Unpublished tour that exists only to satisfy the show's tour requirement. */
export const SCAN_PRACTICE_TOUR_SLUG = 'kf-scanner-practice'
export const SCAN_PRACTICE_SHOW_SLUG = 'kf-scanner-practice'
/**
 * Stable id so a practice order cannot collide with a Stripe session. Every
 * practice order's session id starts with this; the group booking uses it as is.
 */
export const SCAN_PRACTICE_SESSION = 'scan-practice'
/** Order filter that leaves every practice order out of sales, exports and mailing lists. */
export const NOT_SCAN_PRACTICE_SESSION = { $not: /^scan-practice/ }
export const SCAN_PRACTICE_QUANTITY = 4
const SCAN_PRACTICE_EMAIL = 'scanner-practice@kevinfraserofficial.invalid'

type PracticeBooking = {
  session: string
  email: string
  holderName: string
  tierName: string
  quantity: number
  /** The QR card this order appears under on the scan test. */
  card: string
}

const PRACTICE_CARDS = [
  { key: 'single-a', label: 'Single ticket', hint: 'Admits on the scan' },
  { key: 'single-b', label: 'Single ticket', hint: 'Admits on the scan' },
  { key: 'group', label: 'Group of 4', hint: 'Choose how many to admit' },
  { key: 'mixed', label: 'Two ticket classes', hint: '3 Standard and 2 VIP on one booking' },
] as const

/**
 * What a door actually meets: two single tickets, a group booking, and a
 * guest holding two ticket classes. The first order of each card carries its QR code.
 */
const PRACTICE_BOOKINGS: PracticeBooking[] = [
  {
    session: `${SCAN_PRACTICE_SESSION}-single-a`,
    email: 'single-a@scanner-practice.invalid',
    holderName: 'Test Guest One',
    tierName: 'Practice',
    quantity: 1,
    card: 'single-a',
  },
  {
    session: `${SCAN_PRACTICE_SESSION}-single-b`,
    email: 'single-b@scanner-practice.invalid',
    holderName: 'Test Guest Two',
    tierName: 'Practice',
    quantity: 1,
    card: 'single-b',
  },
  {
    session: SCAN_PRACTICE_SESSION,
    email: SCAN_PRACTICE_EMAIL,
    holderName: 'Test Group',
    tierName: 'Practice',
    quantity: SCAN_PRACTICE_QUANTITY,
    card: 'group',
  },
  {
    session: `${SCAN_PRACTICE_SESSION}-mixed-standard`,
    email: 'mixed@scanner-practice.invalid',
    holderName: 'Test Mixed Booking',
    tierName: 'Practice Standard',
    quantity: 3,
    card: 'mixed',
  },
  {
    session: `${SCAN_PRACTICE_SESSION}-mixed-vip`,
    email: 'mixed@scanner-practice.invalid',
    holderName: 'Test Mixed Booking',
    tierName: 'Practice VIP',
    quantity: 2,
    card: 'mixed',
  },
]

export function isScanPracticeTour(tour: { slug?: string | null } | null | undefined) {
  return tour?.slug === SCAN_PRACTICE_TOUR_SLUG
}

export function isScanPracticeOrder(order: { stripeSessionId?: string | null; show?: unknown }) {
  if (String(order.stripeSessionId || '').startsWith(SCAN_PRACTICE_SESSION)) return true
  const show = order.show
  if (show && typeof show === 'object' && 'scanPractice' in show) {
    return isScanPracticeShow(show as { scanPractice?: boolean | null })
  }
  return false
}

/** Same JSON the ticket PDF encodes, so the door camera can read a practice code. */
export function practiceQrPayload(orderId: string, ticket: number, quantity: number) {
  return JSON.stringify({ order: orderId, ticket, of: quantity })
}

export type PracticeCode = {
  key: string
  label: string
  hint: string
  qrDataUrl: string
  purchased: number
  admitted: number
}

export type PracticeState = {
  ready: boolean
  showId?: string
  codes?: PracticeCode[]
}

async function ensurePracticeTour() {
  const existing = await Tour.findOne({ slug: SCAN_PRACTICE_TOUR_SLUG })
  if (existing) {
    if (existing.published || existing.featured) {
      existing.published = false
      existing.featured = false
      await existing.save()
    }
    return existing
  }
  return Tour.create({
    title: 'Scanner practice',
    slug: SCAN_PRACTICE_TOUR_SLUG,
    subtitle: 'Hidden door-scanner test. Not a real tour.',
    published: false,
    featured: false,
  })
}

async function ensurePracticeShow(tourId: unknown) {
  let show = await Show.findOne({ scanPractice: true })
  if (!show) {
    show = new Show({
      tour: tourId,
      title: 'Scanner practice',
      date: new Date('2099-01-01T00:00:00.000Z'),
      country: 'Australia',
      city: 'Practice',
      venue: 'Door test',
      currency: 'AUD',
      priceCents: 0,
      capacity: 0,
      ticketsSold: 0,
      status: 'coming_soon',
      published: false,
      featured: false,
      waitlistEnabled: false,
      scanPractice: true,
    })
  }

  const slugTaken = await Show.exists({
    slug: SCAN_PRACTICE_SHOW_SLUG,
    _id: { $ne: show._id },
  })

  show.tour = tourId as typeof show.tour
  show.title = 'Scanner practice'
  show.city = 'Practice'
  show.venue = 'Door test'
  show.country = show.country || 'Australia'
  show.currency = 'AUD'
  show.priceCents = 0
  show.capacity = 0
  show.ticketsSold = 0
  show.status = 'coming_soon'
  show.published = false
  show.featured = false
  show.waitlistEnabled = false
  show.externalTicketUrl = ''
  show.scanPractice = true
  if (!slugTaken) show.slug = SCAN_PRACTICE_SHOW_SLUG
  await show.save()
  return show
}

type PracticeOrder = {
  _id: unknown
  stripeSessionId: string
  quantity: number
  checkedIn?: { ticket: number }[]
}

async function ensurePracticeOrders(showId: unknown) {
  const orders: PracticeOrder[] = []
  for (const booking of PRACTICE_BOOKINGS) {
    let order = await Order.findOne({ stripeSessionId: booking.session })
    if (!order) {
      order = new Order({
        show: showId,
        stripeSessionId: booking.session,
        email: booking.email,
        quantity: booking.quantity,
        amountTotal: 0,
        currency: 'AUD',
        issuedBy: 'scan-practice',
      })
    }

    order.show = showId as typeof order.show
    order.email = booking.email
    order.holderName = booking.holderName
    order.quantity = booking.quantity
    order.amountTotal = 0
    order.currency = 'AUD'
    order.status = 'paid'
    order.source = 'manual'
    order.inventoryCounted = false
    order.tierName = booking.tierName
    order.note = 'Door scanner practice. Not a real sale.'
    order.voidedTickets.splice(0, order.voidedTickets.length)
    await order.save()
    orders.push(order)
  }
  return orders
}

async function findPracticeOrders(showId: mongoose.Types.ObjectId) {
  const orders = await Order.find({
    show: showId,
    status: 'paid',
    stripeSessionId: { $in: PRACTICE_BOOKINGS.map((booking) => booking.session) },
  })
  return orders.length === PRACTICE_BOOKINGS.length ? orders : null
}

async function serializePractice(showId: unknown, orders: PracticeOrder[]): Promise<PracticeState> {
  const bySession = new Map(orders.map((order) => [order.stripeSessionId, order]))
  const codes: PracticeCode[] = []
  for (const card of PRACTICE_CARDS) {
    const cardOrders = PRACTICE_BOOKINGS.filter((booking) => booking.card === card.key)
      .map((booking) => bySession.get(booking.session))
      .filter((order): order is PracticeOrder => Boolean(order))
    const first = cardOrders[0]
    if (!first) continue
    const qrDataUrl = await QRCode.toDataURL(practiceQrPayload(String(first._id), 1, first.quantity), {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    codes.push({
      key: card.key,
      label: card.label,
      hint: card.hint,
      qrDataUrl,
      purchased: cardOrders.reduce((sum, order) => sum + order.quantity, 0),
      admitted: cardOrders.reduce(
        (sum, order) => sum + new Set((order.checkedIn || []).map((row) => row.ticket)).size,
        0,
      ),
    })
  }
  return { ready: true, showId: String(showId), codes }
}

export async function readScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const show = await Show.findOne({ scanPractice: true })
  if (!show) return { ready: false }
  const orders = await findPracticeOrders(show._id)
  if (!orders) return { ready: false }
  return serializePractice(show._id, orders)
}

/** Create the hidden show and fake bookings. Does not clear admissions already recorded. */
export async function setupScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const tour = await ensurePracticeTour()
  const show = await ensurePracticeShow(tour._id)
  const orders = await ensurePracticeOrders(show._id)
  return serializePractice(show._id, orders)
}

/** Clear practice admissions and their history so the same codes can be scanned again. */
export async function resetScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const show = await Show.findOne({ scanPractice: true })
  const orders = show ? await findPracticeOrders(show._id) : null
  if (!show || !orders) return setupScanPractice()
  for (const order of orders) {
    order.checkedIn.splice(0, order.checkedIn.length)
    await order.save()
  }
  await Admission.deleteMany({ order: { $in: orders.map((order) => order._id) } })
  return serializePractice(show._id, orders)
}
