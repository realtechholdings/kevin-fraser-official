/**
 * Show/tour datetimes are wall-clock values: the calendar day and time entered
 * in admin must not shift across timezones. We store them as UTC instants whose
 * UTC components equal that wall clock, and always read/format in UTC.
 */

const HAS_TZ = /(?:[zZ]|[+-]\d{2}:?\d{2})$/

/** Parse admin datetime-local (or ISO) into a Date without timezone shifting. */
export function parseWallDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const raw = String(value).trim()
  if (!raw) return null

  // Already timezone-aware (legacy offset / ISO) — keep the absolute instant.
  if (HAS_TZ.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  // datetime-local / date-only: treat components as UTC wall clock.
  let normalized = raw
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    normalized = `${raw}:00Z`
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) {
    normalized = `${raw}Z`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    normalized = `${raw}T00:00:00Z`
  } else {
    normalized = `${raw}Z`
  }

  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Format an ISO date for `<input type="datetime-local">` using UTC wall clock. */
export function toWallInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
