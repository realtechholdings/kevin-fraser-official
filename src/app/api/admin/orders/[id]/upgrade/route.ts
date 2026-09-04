import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import Order from '@/lib/models/Order'
import { notifyPaidOrderEmails } from '@/lib/tickets/notifyPaidOrder'
import { checkoutReturnUrl } from '@/lib/stripe'
import {
  listUpgradeTargets,
  quoteUpgrade,
  serializeUpgradeTarget,
  startUpgradeCheckout,
} from '@/lib/tickets/upgrades'

type Ctx = { params: Promise<{ id: string }> }

function hostOf(req: NextRequest) {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id.' }, { status: 400 })
    }
    await dbConnect()
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }

    const listed = await listUpgradeTargets(order, { bypassSoldOut: true })
    return NextResponse.json({
      success: true,
      blocked: listed.blocked,
      from: listed.from
        ? { slug: listed.from.slug, name: listed.from.name, priceCents: listed.from.priceCents }
        : null,
      targets: listed.targets.map(serializeUpgradeTarget),
    })
  } catch (error) {
    console.error('Admin upgrade GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load upgrade options.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { id } = await ctx.params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid order id.' }, { status: 400 })
    }
    const body = await req.json()
    const toSlug = String(body.toSlug || '').trim().toLowerCase()
    const comp = Boolean(body.comp)
    if (!toSlug) {
      return NextResponse.json({ success: false, error: 'Pick a class to upgrade to.' }, { status: 400 })
    }

    await dbConnect()
    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }

    const quoted = await quoteUpgrade(order, toSlug, { bypassSoldOut: true })
    if ('error' in quoted) {
      return NextResponse.json({ success: false, error: quoted.error }, { status: quoted.status })
    }

    if (comp) quoted.quote.target.chargeCents = 0

    const started = await startUpgradeCheckout({
      original: order,
      show: quoted.show,
      quote: quoted.quote,
      req,
      issuedBy: admin.emails?.[0] || admin.userId,
      note: comp ? 'Admin complimentary upgrade' : 'Admin upgrade checkout',
      cancelUrl: `${checkoutReturnUrl(req)}/worlds/stage?cancelled=1`,
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
    console.error('Admin upgrade POST:', error)
    const message = error instanceof Error ? error.message : 'Upgrade failed.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
