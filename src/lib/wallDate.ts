/**
 * Show/tour datetimes are plain wall-clock values — exactly what the admin enters.
 * Timezone suffixes (Z, +10:00, etc.) are ignored; only the YYYY-MM-DD and HH:mm
 * digits matter. Stored in Mongo as a Date whose UTC components equal that wall clock.
 */

const WALL_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/

export type WallParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

/** Pull calendar/time digits out of any date string; ignore timezone entirely. */
export function parseWallParts(value: string | Date | null | undefined): WallParts | null {
  if (value == null || value === '') return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
      hour: value.getUTCHours(),
      minute: value.getUTCMinutes(),
      second: value.getUTCSeconds(),
    }
  }

  const raw = String(value).trim()
  const m = raw.match(WALL_RE)
  if (!m) return null

  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4] || 0)
  const minute = Number(m[5] || 0)
  const second = Number(m[6] || 0)

  if (
    [year, month, day, hour, minute, second].some((n) => Number.isNaN(n)) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null
  }

  return { year, month, day, hour, minute, second }
}

/** Parse admin input into a Date whose UTC fields equal the entered wall clock. */
export function parseWallDate(value: string | Date | null | undefined): Date | null {
  const parts = parseWallParts(value)
  if (!parts) return null
  const d = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  )
  return Number.isNaN(d.getTime()) ? null : d
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** `datetime-local` value: YYYY-MM-DDTHH:mm (no timezone). */
export function toWallInput(value?: string | Date | null): string {
  const parts = parseWallParts(value ?? null)
  if (!parts) return ''
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/** Stable API/storage string with no timezone suffix. */
export function toWallIso(value?: string | Date | null): string {
  const parts = parseWallParts(value ?? null)
  if (!parts) return ''
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.000`
}
