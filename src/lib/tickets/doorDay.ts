import { showTimeZone } from '@/lib/shows/eventSchema'
import { parseWallParts } from '@/lib/wallDate'

/** After midnight the door stays on yesterday's show until this hour, local time. */
export const DOOR_LATE_NIGHT_HOUR = 6

const FALLBACK_ZONE = 'Australia/Sydney'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function previousDateKey(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() - 1)
  return dateKey(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate())
}

function zonedCalendar(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(now)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
  }
}

/** Calendar dates a door may check in for, in the show's own timezone. */
export function doorDateKeys(city: string, country: string, now = new Date()) {
  const zone = showTimeZone(city, country) || FALLBACK_ZONE
  const local = zonedCalendar(now, zone)
  const keys = new Set([dateKey(local.year, local.month, local.day)])
  if (local.hour < DOOR_LATE_NIGHT_HOUR) {
    keys.add(previousDateKey(local.year, local.month, local.day))
  }
  return keys
}

/** True when this show is the one on tonight, including the early hours after midnight. */
export function isShowOnDoorNight(
  date: string | Date | null | undefined,
  city: string,
  country: string,
  now = new Date(),
) {
  const wall = parseWallParts(date)
  if (!wall) return false
  return doorDateKeys(city, country, now).has(dateKey(wall.year, wall.month, wall.day))
}
