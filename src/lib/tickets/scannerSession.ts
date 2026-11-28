import { NextResponse } from 'next/server'
import { requireAdmin, staffDisplayName, staffEmail } from '@/lib/admin'
import { hasPermission, isDoorStaff } from '@/lib/admin/access'
import dbConnect from '@/lib/db'
import { orderShowId, type Usher } from '@/lib/tickets/admissionService'
import { doorStaffShowError } from '@/lib/tickets/doorAccess'
import { isShowOnDoorNight } from '@/lib/tickets/doorDay'
import { isScanPracticeOrder } from '@/lib/tickets/scanPractice'

export type ScannerSession = {
  /** Show this door is admitting for; empty when an admin has "Any show" selected. */
  showId: string
  /** Door accounts only ever work tonight's show. */
  doorOnly: boolean
  /** May reverse an admission. */
  supervisor: boolean
  usher: Usher
}

/**
 * Who is on this scanner and which door they are working. Every scanner
 * route starts here, so the usher on record is always the signed-in account
 * and never something the device sent.
 */
export async function openScannerSession(
  rawShowId: unknown,
): Promise<{ ok: true; session: ScannerSession } | { ok: false; response: NextResponse }> {
  const admin = await requireAdmin('scanner')
  if (!admin.ok) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: admin.error }, { status: admin.status }),
    }
  }

  const showId = typeof rawShowId === 'string' ? rawShowId.trim() : ''
  const doorOnly = isDoorStaff(admin.access)
  if (doorOnly) {
    const doorError = await doorStaffShowError(admin.access.permissions, showId)
    if (doorError) {
      return {
        ok: false,
        response: NextResponse.json({ success: false, error: doorError }, { status: 403 }),
      }
    }
  }

  await dbConnect()
  return {
    ok: true,
    session: {
      showId,
      doorOnly,
      supervisor: hasPermission(admin.access, 'reversals'),
      usher: {
        id: admin.userId,
        name: staffDisplayName(admin.user),
        email: staffEmail(admin.user),
      },
    },
  }
}

/**
 * A door only works its own show. Practice bookings only open at the
 * practice door, so a test can never mark a real guest as inside.
 */
export function orderAllowedAtDoor(
  order: { show?: unknown; stripeSessionId?: string | null },
  session: Pick<ScannerSession, 'showId' | 'doorOnly'>,
) {
  const show = order.show as { date?: Date; city?: string; country?: string } | null | undefined
  const showId = orderShowId(order)
  if (session.doorOnly) {
    if (!show || typeof show !== 'object') return false
    if (!isShowOnDoorNight(show.date, show.city || '', show.country || '')) return false
  }
  if (session.showId && showId !== session.showId) return false
  if (isScanPracticeOrder(order) && showId !== session.showId) return false
  return true
}
