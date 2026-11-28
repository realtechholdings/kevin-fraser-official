import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import Admission from '@/lib/models/Admission'
import {
  loadBooking,
  loadDoorOrder,
  reverseAdmission,
  reverseLegacyCheckIns,
} from '@/lib/tickets/admissionService'
import { openScannerSession, orderAllowedAtDoor } from '@/lib/tickets/scannerSession'

const LEGACY_PREFIX = 'legacy:'

/**
 * Supervisor only: put an incorrect admission back. The original entry is
 * kept and the reversal is recorded beside it with the supervisor's name.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const opened = await openScannerSession(body.showId)
    if (!opened.ok) return opened.response
    const { session } = opened

    if (!session.supervisor) {
      return NextResponse.json(
        { success: false, error: 'Only a door supervisor can reverse an admission.' },
        { status: 403 },
      )
    }

    const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const legacy = entryId.startsWith(LEGACY_PREFIX)

    let orderId = ''
    if (legacy) {
      orderId = entryId.slice(LEGACY_PREFIX.length)
    } else if (mongoose.isValidObjectId(entryId)) {
      const target = await Admission.findById(entryId).select('order kind')
      if (target?.kind === 'admit') orderId = String(target.order)
    }

    const order = orderId ? await loadDoorOrder(orderId) : null
    if (!order) {
      return NextResponse.json({ success: false, error: 'Admission not found.' }, { status: 404 })
    }
    if (!orderAllowedAtDoor(order, session)) {
      return NextResponse.json(
        { success: false, error: 'That booking is not for this door.' },
        { status: 403 },
      )
    }

    const result = legacy
      ? await reverseLegacyCheckIns({ orderId, usher: session.usher, reason })
      : await reverseAdmission({ admissionId: entryId, usher: session.usher, reason })

    const anchorId =
      typeof body.anchorOrderId === 'string' && mongoose.isValidObjectId(body.anchorOrderId)
        ? body.anchorOrderId
        : orderId
    const anchor = (await loadDoorOrder(anchorId)) || order
    const booking = await loadBooking(orderAllowedAtDoor(anchor, session) ? anchor : order)

    if (!result.ok) {
      const error =
        result.reason === 'already_reversed'
          ? 'That admission has already been reversed.'
          : result.reason === 'nothing_to_reverse'
            ? 'There is nothing left to reverse on that entry.'
            : 'Admission not found.'
      return NextResponse.json({ success: false, error, booking }, { status: 409 })
    }

    return NextResponse.json({ success: true, verdict: 'reversed', reversed: result.quantity, booking })
  } catch (error) {
    console.error('Scanner reverse POST:', error)
    return NextResponse.json(
      { success: false, error: 'Could not reverse that admission.' },
      { status: 500 },
    )
  }
}
