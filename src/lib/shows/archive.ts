/**
 * Public Stage / checkout only list shows that are still on the site.
 * Scanner-practice shows stay hidden even if published is flipped on.
 */
export const ACTIVE_SHOW_FILTER = { archivedAt: null, scanPractice: { $ne: true } } as const

/** Admin lists keep archived shows, but never the hidden scanner-practice show. */
export const NOT_SCAN_PRACTICE = { scanPractice: { $ne: true } } as const

export function isShowArchived(show: { archivedAt?: Date | string | null }) {
  return Boolean(show.archivedAt)
}

export function isScanPracticeShow(show: { scanPractice?: boolean | null } | null | undefined) {
  return Boolean(show?.scanPractice)
}

export function archiveShowFields(by: string) {
  return {
    archivedAt: new Date(),
    archivedBy: String(by || '').trim(),
    published: false,
  }
}

export function restoreShowFields() {
  return {
    archivedAt: null,
    archivedBy: '',
    published: true,
  }
}
