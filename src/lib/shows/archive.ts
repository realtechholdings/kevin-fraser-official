/** Public Stage / checkout only list shows that have not been archived. */
export const ACTIVE_SHOW_FILTER = { archivedAt: null } as const

export function isShowArchived(show: { archivedAt?: Date | string | null }) {
  return Boolean(show.archivedAt)
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
