import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import { formatShowDate } from '@/lib/format'
import { toWallIso } from '@/lib/wallDate'
import { checkoutReturnUrl } from '@/lib/stripe'
import { notifyPaidOrderEmails } from '@/lib/tickets/notifyPaidOrder'
import { verifyUpgradeToken } from '@/lib/tickets/upgradeToken'
import {
  listUpgradeTargets,
  quoteUpgrade,
  serializeUpgradeTarget,
  startUpgradeCheckout,
} from '@/lib/tickets/upgrades'

function hostOf(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim()
}

async function loadOwnedOrder(orderId: string, token: string) {
  if (!orderId || !mongoose.isValidObjectId(orderId)) return null
  const order = await Order.findById(orderId)
  if (!order) return null
  if (!verifyUpgradeToken(String(order._id), order.email, token)) return null
  return order
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const orderId = String(url.searchParams.get('order') || '')
    const token = String(url.searchParams.get('token') || '')

    await dbConnect()
    const order = await loadOwnedOrder(orderId, token)
    if (!order) {
      return NextResponse.json({ success: false, error: 'This upgrade link is not valid.' }, { status: 404 })
    }

    const listed = await listUpgradeTargets(order, { publicOnly: true })
    const show = listed.show
    const date = show?.date ? formatShowDate(toWallIso(show.date) || String(show.date)).full : ''

    return NextResponse.json({
      success: true,
      blocked: listed.blocked,
      order: {
        id: String(order._id),
        email: order.email,
        quantity: order.quantity,
        tierName: listed.from?.name || order.tierName,
        status: order.status,
      },
      show: show
        ? {
            city: show.city,
            venue: show.venue,
            date,
            tour:
              show.tour && typeof show.tour === 'object' && 'title' in show.tour
                ? String((show.tour as { title: string }).title || '')
                : '',
          }
        : null,
      offers: listed.targets.map(serializeUpgradeTarget),
    })
  } catch (error) {
    console.error('Upgrade GET:', error)
    return NextResponse.json({ success: false, error: 'Could not load upgrades.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const orderId = String(body.order || body.orderId || '')
    const token = String(body.token || '')
    const toSlug = String(body.toSlug || '').trim().toLowerCase()

    if (!toSlug) {
      return NextResponse.json({ success: false, error: 'Pick a class to upgrade to.' }, { status: 400 })
    }

    await dbConnect()
    const order = await loadOwnedOrder(orderId, token)
    if (!order) {
      return NextResponse.json({ success: false, error: 'This upgrade link is not valid.' }, { status: 404 })
    }

    const quoted = await quoteUpgrade(order, toSlug, { publicOnly: true })
    if ('error' in quoted) {
      return NextResponse.json({ success: false, error: quoted.error }, { status: quoted.status })
    }

    const cancelBase = checkoutReturnUrl(req)
    const started = await startUpgradeCheckout({
      original: order,
      show: quoted.show,
      quote: quoted.quote,
      req,
      cancelUrl: `${cancelBase}/worlds/stage/upgrade?order=${order._id}&token=${encodeURIComponent(token)}&cancelled=1`,
    })

    if ('completedOrderId' in started) {
      const next = await Order.findById(started.completedOrderId)
      if (next) await notifyPaidOrderEmails(next, { host: hostOf(req) })
      return NextResponse.json({
        success: true,
        completed: true,
        orderId: started.completedOrderId,
      })
    }

    return NextResponse.json({ success: true, url: started.url, sessionId: started.sessionId })
  } catch (error) {
    console.error('Upgrade POST:', error)
    const message = error instanceof Error ? error.message : 'Upgrade failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
