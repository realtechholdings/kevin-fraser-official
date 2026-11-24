import mongoose from 'mongoose'
import { isDoorStaff, type AdminPermission } from '@/lib/admin/access'
import dbConnect from '@/lib/db'
import Show from '@/lib/models/Show'
import { isShowOnDoorNight } from '@/lib/tickets/doorDay'

/**
 * Door staff may only open the show on tonight.
 * Returns an error message when the show is off limits, otherwise null.
 */
export async function doorStaffShowError(
  permissions: readonly AdminPermission[],
  showId: string,
) {
  if (!isDoorStaff({ permissions })) return null
  if (!mongoose.isValidObjectId(showId)) return "Tonight's show is not open for check-in."

  await dbConnect()
  const show = await Show.findById(showId).select('date city country scanPractice')
  if (
    !show ||
    show.scanPractice ||
    !isShowOnDoorNight(show.date, show.city || '', show.country || '')
  ) {
    return 'That show is not on tonight.'
  }
  return null
}
