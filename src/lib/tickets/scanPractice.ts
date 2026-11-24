import QRCode from 'qrcode'
import dbConnect from '../db'
import Order from '../models/Order'
import Show from '../models/Show'
import Tour from '../models/Tour'
import { isScanPracticeShow } from '../shows/archive'

/** Unpublished tour that exists only to satisfy the show's tour requirement. */
export const SCAN_PRACTICE_TOUR_SLUG = 'kf-scanner-practice'
export const SCAN_PRACTICE_SHOW_SLUG = 'kf-scanner-practice'
/** Stable id so the practice order cannot collide with a Stripe session. */
export const SCAN_PRACTICE_SESSION = 'scan-practice'
export const SCAN_PRACTICE_QUANTITY = 4
const SCAN_PRACTICE_EMAIL = 'scanner-practice@kevinfraserofficial.invalid'

export function isScanPracticeTour(tour: { slug?: string | null } | null | undefined) {
  return tour?.slug === SCAN_PRACTICE_TOUR_SLUG
}

export function isScanPracticeOrder(order: { stripeSessionId?: string | null; show?: unknown }) {
  if (order.stripeSessionId === SCAN_PRACTICE_SESSION) return true
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

export type PracticeTicket = {
  ticket: number
  qrDataUrl: string
  checkedIn: boolean
}

export type PracticeState = {
  ready: boolean
  showId?: string
  orderId?: string
  tickets?: PracticeTicket[]
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

async function ensurePracticeOrder(showId: unknown) {
  let order = await Order.findOne({ stripeSessionId: SCAN_PRACTICE_SESSION })
  if (!order) {
    order = new Order({
      show: showId,
      stripeSessionId: SCAN_PRACTICE_SESSION,
      email: SCAN_PRACTICE_EMAIL,
      holderName: 'Scan test',
      quantity: SCAN_PRACTICE_QUANTITY,
      amountTotal: 0,
      currency: 'AUD',
      status: 'paid',
      source: 'manual',
      issuedBy: 'scan-practice',
      note: 'Door scanner practice. Not a real sale.',
      inventoryCounted: false,
      tierName: 'Practice',
    })
  }

  order.show = showId as typeof order.show
  order.email = SCAN_PRACTICE_EMAIL
  order.holderName = 'Scan test'
  order.quantity = SCAN_PRACTICE_QUANTITY
  order.amountTotal = 0
  order.currency = 'AUD'
  order.status = 'paid'
  order.source = 'manual'
  order.inventoryCounted = false
  order.tierName = 'Practice'
  order.note = 'Door scanner practice. Not a real sale.'
  order.voidedTickets.splice(0, order.voidedTickets.length)
  await order.save()
  return order
}

async function serializePractice(
  showId: unknown,
  order: { _id: unknown; quantity: number; checkedIn?: { ticket: number }[] },
): Promise<PracticeState> {
  const checked = new Set((order.checkedIn || []).map((row) => row.ticket))
  const tickets: PracticeTicket[] = []
  for (let ticket = 1; ticket <= order.quantity; ticket += 1) {
    const qrDataUrl = await QRCode.toDataURL(practiceQrPayload(String(order._id), ticket, order.quantity), {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
    tickets.push({ ticket, qrDataUrl, checkedIn: checked.has(ticket) })
  }
  return {
    ready: true,
    showId: String(showId),
    orderId: String(order._id),
    tickets,
  }
}

export async function readScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const show = await Show.findOne({ scanPractice: true })
  if (!show) return { ready: false }
  const order = await Order.findOne({ stripeSessionId: SCAN_PRACTICE_SESSION, show: show._id })
  if (!order || order.status !== 'paid') return { ready: false }
  return serializePractice(show._id, order)
}

/** Create the hidden show and fake tickets. Does not clear check-ins already recorded. */
export async function setupScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const tour = await ensurePracticeTour()
  const show = await ensurePracticeShow(tour._id)
  const order = await ensurePracticeOrder(show._id)
  return serializePractice(show._id, order)
}

/** Clear practice check-ins so the same codes can be scanned again. */
export async function resetScanPractice(): Promise<PracticeState> {
  await dbConnect()
  const show = await Show.findOne({ scanPractice: true })
  const order = show
    ? await Order.findOne({ stripeSessionId: SCAN_PRACTICE_SESSION, show: show._id })
    : null
  if (!show || !order) return setupScanPractice()
  order.checkedIn.splice(0, order.checkedIn.length)
  await order.save()
  return serializePractice(show._id, order)
}
