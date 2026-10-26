import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import Show from '@/lib/models/Show'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { normalizeCheckoutEmail } from '@/lib/email/address'
import { checkoutReturnUrl } from '@/lib/stripe'
import { verifyUpgradeToken } from '@/lib/tickets/upgradeToken'
import { notifyPaidOrderEmails } from '@/lib/tickets/notifyPaidOrder'
import { refundableTicketNumbers } from '@/lib/tickets/ticketNumbers'
import { listTransferShows, startTransfer, transferBlockReason } from '@/lib/tickets/transfers'

function hostOf(req: NextRequest) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
}

async function loadOwnedOrder(orderId: string, token: string, email: string) {
  if (!mongoose.isValidObjectId(orderId)) return null
  const order = await Order.findById(orderId)
  if (!order) return null
  if (token && verifyUpgradeToken(String(order._id), order.email, token)) return order
  const normalized = normalizeCheckoutEmail(email)
  if (normalized && normalized === order.email) return order
  return null
}

export async function GET(req: NextRequest) {
  try {
    const orderId = String(req.nextUrl.searchParams.get('order') || '')
    const token = String(req.nextUrl.searchParams.get('token') || '')
    const email = String(req.nextUrl.searchParams.get('email') || '')
    const quantity = Math.floor(Number(req.nextUrl.searchParams.get('quantity')) || 0)

    await dbConnect()
    const order = await loadOwnedOrder(orderId, token, email)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Enter the email and order number from your ticket.' },
        { status: 404 },
      )
    }

    const movable = refundableTicketNumbers(order).length
    const qty = quantity > 0 ? Math.min(quantity, movable) : movable
    const listed = await listTransferShows(order, qty || 1)
    const origin = await Show.findById(order.show)
    const date = origin?.date ? formatShowDate(toWallIso(origin.date) || String(origin.date)).full : ''

    return NextResponse.json({
      success: true,
      blocked: transferBlockReason(order) || listed.error,
      order: {
        id: String(order._id),
        email: order.email,
        holderName: order.holderName || '',
        quantity: movable,
        tierName: order.tierName || 'General Admission',
      },
      show: origin
        ? { city: origin.city, venue: origin.venue, date }
        : null,
      shows: listed.shows,
    })
  } catch (error) {
    console.error('Transfer GET:', error)
    return NextResponse.json({ success: false, error: 'Could not load transfers.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const orderId = String(body.order || body.orderId || '')
    const token = String(body.token || '')
    const email = String(body.email || '')
    const showId = String(body.showId || '')
    const toSlug = String(body.toSlug || '').trim().toLowerCase()
    const quantity = Math.floor(Number(body.quantity) || 0)

    if (!showId || !toSlug) {
      return NextResponse.json({ success: false, error: 'Choose a show and a ticket class.' }, { status: 400 })
    }

    await dbConnect()
    const order = await loadOwnedOrder(orderId, token, email)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Enter the email and order number from your ticket.' },
        { status: 404 },
      )
    }

    const cancelBase = checkoutReturnUrl(req)
    const started = await startTransfer({
      original: order,
      showId,
      toSlug,
      quantity,
      req,
      cancelUrl: `${cancelBase}/worlds/stage/transfer?order=${order._id}&token=${encodeURIComponent(token)}&cancelled=1`,
    })

    if ('completedOrderId' in started) {
      const next = await Order.findById(started.completedOrderId)
      if (next) await notifyPaidOrderEmails(next, { host: hostOf(req) })
      return NextResponse.json({ success: true, completed: true, orderId: started.completedOrderId })
    }

    return NextResponse.json({ success: true, url: started.url, sessionId: started.sessionId })
  } catch (error) {
    console.error('Transfer POST:', error)
    const message = error instanceof Error ? error.message : 'Transfer failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
