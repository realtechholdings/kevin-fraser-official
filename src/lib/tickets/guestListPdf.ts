import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { slugify } from '@/lib/format'

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = { left: 36, right: 36, top: 40, bottom: 40 }
const INK = rgb(0.08, 0.08, 0.1)
const MUTED = rgb(0.38, 0.38, 0.42)
const RULE = rgb(0.82, 0.82, 0.85)
const HEADER_BG = rgb(0.1, 0.1, 0.13)
const HEADER_FG = rgb(0.96, 0.96, 0.97)
const ZEBRA = rgb(0.97, 0.97, 0.98)

export type GuestListRow = {
  orderId: string
  name: string
  email: string
  quantity: number
  tierName: string
  tableLabel: string
  source: string
  checkedIn: number
  note: string
  /** When they first paid, or the issue time for a comp. ISO string. */
  purchasedAt: string | null
}

export type GuestListShowInfo = {
  city: string
  venue: string
  tour: string
  dateLabel: string
  timeLabel: string
}

type GuestOrder = {
  id?: string
  email?: string
  holderName?: string
  quantity?: number
  tierName?: string
  tableNames?: string[]
  tableQuantity?: number
  source?: string
  note?: string
  checkedIn?: { ticket?: number }[]
  status?: string
  purchasedAt?: Date | string | null
}

type ColKey = 'num' | 'guest' | 'qty' | 'class' | 'table' | 'arrived'

const FLAT_COLS: Record<ColKey, { x: number; w: number }> = {
  num: { x: 0, w: 28 },
  guest: { x: 28, w: 188 },
  qty: { x: 216, w: 36 },
  class: { x: 252, w: 118 },
  table: { x: 370, w: 92 },
  arrived: { x: 462, w: 61 },
}

/** Class is the page title, so the name column can take that width. */
const CLASS_COLS: Record<ColKey, { x: number; w: number }> = {
  num: { x: 0, w: 28 },
  guest: { x: 28, w: 270 },
  qty: { x: 298, w: 40 },
  class: { x: 0, w: 0 },
  table: { x: 338, w: 118 },
  arrived: { x: 456, w: 67 },
}

function guestName(order: GuestOrder) {
  const name = String(order.holderName || '').trim()
  if (name) return name
  const email = String(order.email || '').trim().toLowerCase()
  if (!email || email === 'pending@checkout') return 'Guest'
  return email
}

function tableLabelOf(order: GuestOrder) {
  const names = (order.tableNames || []).map((n) => String(n || '').trim()).filter(Boolean)
  if (names.length) return names.join(', ')
  const tables = Number(order.tableQuantity) || 0
  if (tables > 0) return `${tables} table${tables === 1 ? '' : 's'}`
  return ''
}

export function buildGuestListRows(orders: GuestOrder[]): GuestListRow[] {
  return orders
    .filter((order) => !order.status || order.status === 'paid')
    .map((order) => {
      const email = String(order.email || '').trim().toLowerCase()
      const name = guestName(order)
      const purchased =
        order.purchasedAt instanceof Date
          ? order.purchasedAt
          : order.purchasedAt
            ? new Date(order.purchasedAt)
            : null
      return {
        orderId: String(order.id || ''),
        name,
        email: email === 'pending@checkout' ? '' : email,
        quantity: Math.max(1, Number(order.quantity) || 1),
        tierName: String(order.tierName || 'General Admission'),
        tableLabel: tableLabelOf(order),
        source: order.source === 'manual' ? 'comp' : 'paid',
        checkedIn: (order.checkedIn || []).length,
        note: String(order.note || '').trim(),
        purchasedAt: purchased && !Number.isNaN(purchased.getTime()) ? purchased.toISOString() : null,
      }
    })
    .sort(compareGuestNames)
}

export type GuestListGroup = 'class' | 'name'

export type GuestListSection = {
  /** Ticket class. Empty when the list is one A–Z run. */
  title: string
  rows: GuestListRow[]
}

export function compareGuestNames(
  a: Pick<GuestListRow, 'name' | 'email'>,
  b: Pick<GuestListRow, 'name' | 'email'>,
) {
  const byName = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  if (byName) return byName
  return a.email.localeCompare(b.email, 'en', { sensitivity: 'base' })
}

/**
 * Door lists are read inside one ticket class. `class` keeps each class together
 * and A–Z inside it, following the show's class order. Names the show no longer
 * sells land after those, still A–Z. `name` is one list across every class.
 */
export function guestListSections(
  rows: GuestListRow[],
  group: GuestListGroup = 'name',
  classOrder: string[] = [],
): GuestListSection[] {
  const sorted = [...rows].sort(compareGuestNames)
  if (group !== 'class') return [{ title: '', rows: sorted }]

  const buckets = new Map<string, GuestListRow[]>()
  for (const row of sorted) {
    const title = row.tierName.trim() || 'General Admission'
    const list = buckets.get(title)
    if (list) list.push(row)
    else buckets.set(title, [row])
  }

  const rank = new Map<string, number>()
  classOrder.forEach((name, index) => {
    const key = name.trim().toLowerCase()
    if (key && !rank.has(key)) rank.set(key, index)
  })

  return [...buckets.keys()]
    .sort((a, b) => {
      const ai = rank.get(a.toLowerCase())
      const bi = rank.get(b.toLowerCase())
      if (ai !== undefined && bi !== undefined && ai !== bi) return ai - bi
      if (ai !== undefined && bi === undefined) return -1
      if (bi !== undefined && ai === undefined) return 1
      return a.localeCompare(b, 'en', { sensitivity: 'base' })
    })
    .map((title) => ({ title, rows: buckets.get(title) || [] }))
}

const WIN_ANSI_PUNCTUATION: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
  '\u00A0': ' ',
  '\u2022': '-',
}

/** Standard PDF fonts throw on characters outside WinAnsi, which aborts printing. */
export function toWinAnsi(value: string) {
  return Array.from(String(value || ''), (ch) => {
    if (WIN_ANSI_PUNCTUATION[ch]) return WIN_ANSI_PUNCTUATION[ch]
    const code = ch.codePointAt(0) || 0
    if (code === 9 || code === 10 || code === 13) return ' '
    if (code >= 0x20 && code <= 0x7e) return ch
    if (code >= 0xa0 && code <= 0xff) return ch
    return ''
  }).join('')
}

function textWidth(font: PDFFont, value: string, size: number) {
  try {
    return font.widthOfTextAtSize(value, size)
  } catch {
    return value.length * size
  }
}

function clamp(text: string, font: PDFFont, size: number, maxWidth: number) {
  let value = toWinAnsi(text)
  while (value.length > 3 && textWidth(font, value, size) > maxWidth) {
    value = value.slice(0, -1)
  }
  if (value !== toWinAnsi(text) && value.length > 3) value = `${value.slice(0, -1)}...`
  return value
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  const safe = toWinAnsi(text)
  if (!safe) return
  try {
    page.drawText(safe, { x, y, size, font, color })
  } catch {
    const ascii = safe.replace(/[^\x20-\x7e]/g, '')
    if (ascii) page.drawText(ascii, { x, y, size, font, color })
  }
}

function filenameFor(show: GuestListShowInfo, note?: string) {
  const date = slugify(show.dateLabel) || 'show'
  const city = slugify(show.city) || 'guest-list'
  const extra = note ? `-${slugify(note)}` : ''
  return `guest-list-${city}-${date}${extra}.pdf`
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function sectionSummary(list: GuestListRow[]) {
  const tickets = list.reduce((sum, row) => sum + row.quantity, 0)
  const comps = list.filter((row) => row.source === 'comp').length
  return [
    countLabel(list.length, 'guest'),
    countLabel(tickets, 'ticket'),
    comps ? `${comps} complimentary` : '',
    'A-Z',
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export async function generateGuestListPdf(
  show: GuestListShowInfo,
  rows: GuestListRow[],
  filenameNote?: string,
  options?: { group?: GuestListGroup; classOrder?: string[] },
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const grouped = options?.group === 'class'
  const cols = grouped ? CLASS_COLS : FLAT_COLS
  const sections = guestListSections(rows, grouped ? 'class' : 'name', options?.classOrder)
  const blocks = sections.length ? sections : [{ title: '', rows: [] }]
  const contentWidth = PAGE.width - MARGIN.left - MARGIN.right
  const tickets = rows.reduce((sum, row) => sum + row.quantity, 0)
  const comps = rows.filter((row) => row.source === 'comp').length
  const generated = new Date().toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const rowHeight = 26
  const headerHeight = 18
  let pageIndex = 0
  let page: PDFPage | null = null
  let y = 0
  let pageSection: GuestListSection = blocks[0]!

  function drawFooter(target: PDFPage, index: number, section: GuestListSection) {
    const summary = grouped && section.title
      ? `Printed ${generated}  ·  ${section.title}`
      : `Printed ${generated}  ·  ${countLabel(rows.length, 'guest')}  ·  ${countLabel(tickets, 'ticket')}`
    drawText(
      target,
      clamp(summary, regular, 8, contentWidth - 70),
      MARGIN.left,
      22,
      regular,
      8,
      MUTED,
    )
    const label = `Page ${index}`
    const w = regular.widthOfTextAtSize(label, 8)
    drawText(target, label, PAGE.width - MARGIN.right - w, 22, regular, 8, MUTED)
  }

  function drawColHeaders(target: PDFPage, top: number) {
    target.drawRectangle({
      x: MARGIN.left,
      y: top - headerHeight + 4,
      width: contentWidth,
      height: headerHeight,
      color: HEADER_BG,
    })
    const textY = top - 10
    const headers: [ColKey, string][] = [
      ['num', '#'],
      ['guest', 'Guest'],
      ['qty', 'Qty'],
      ['class', 'Class'],
      ['table', 'Table'],
      ['arrived', 'Arrived'],
    ]
    for (const [key, label] of headers) {
      if (!cols[key].w) continue
      drawText(target, label, MARGIN.left + cols[key].x + 4, textY, bold, 8, HEADER_FG)
    }
    return top - headerHeight - 4
  }

  function drawBrand() {
    const target = page!
    drawText(target, 'KEVIN FRASER', MARGIN.left, y, bold, 11, INK)
    const badge = 'GUEST LIST'
    const badgeW = bold.widthOfTextAtSize(badge, 9)
    target.drawRectangle({
      x: PAGE.width - MARGIN.right - badgeW - 14,
      y: y - 4,
      width: badgeW + 14,
      height: 16,
      color: HEADER_BG,
    })
    drawText(target, badge, PAGE.width - MARGIN.right - badgeW - 7, y, bold, 9, HEADER_FG)
    y -= 22
  }

  function startPage(section: GuestListSection, continued: boolean) {
    if (page) drawFooter(page, pageIndex, pageSection)
    page = doc.addPage([PAGE.width, PAGE.height])
    pageIndex += 1
    pageSection = section
    y = PAGE.height - MARGIN.top
    drawBrand()

    drawText(page, `${show.city} · ${show.venue}`, MARGIN.left, y, bold, grouped ? 14 : 16, INK)
    y -= 16
    const meta = [show.dateLabel, show.timeLabel, show.tour].filter(Boolean).join('  ·  ')
    if (meta) {
      drawText(page, meta, MARGIN.left, y, regular, 10, MUTED)
      y -= 14
    }

    if (!grouped) {
      const summary = [
        countLabel(rows.length, 'guest'),
        countLabel(tickets, 'ticket'),
        comps ? `${comps} complimentary` : '',
      ]
        .filter(Boolean)
        .join('  ·  ')
      drawText(page, summary, MARGIN.left, y, regular, 9, MUTED)
      y -= 18
    } else if (section.title) {
      y -= 4
      const heading = continued ? `${section.title}  ·  continued` : section.title
      drawText(page, clamp(heading, bold, 15, contentWidth), MARGIN.left, y, bold, 15, INK)
      y -= 16
      drawText(page, sectionSummary(section.rows), MARGIN.left, y, regular, 9, MUTED)
      y -= 16
    }

    y = drawColHeaders(page, y)
  }

  function drawGuest(row: GuestListRow, index: number) {
    const target = page!
    const rowBottom = y - rowHeight

    if (index % 2 === 1) {
      target.drawRectangle({
        x: MARGIN.left,
        y: rowBottom,
        width: contentWidth,
        height: rowHeight,
        color: ZEBRA,
      })
    }
    target.drawLine({
      start: { x: MARGIN.left, y: rowBottom },
      end: { x: PAGE.width - MARGIN.right, y: rowBottom },
      thickness: 0.4,
      color: RULE,
    })

    const mid = rowBottom + 10
    const nameY = row.email && row.name !== row.email ? rowBottom + 14 : mid
    drawText(target, String(index + 1), MARGIN.left + cols.num.x + 4, mid, regular, 9, MUTED)

    const comp = row.source === 'comp' ? ' (comp)' : ''
    const name = clamp(row.name + (grouped ? comp : ''), bold, 9, cols.guest.w - 10)
    drawText(target, name, MARGIN.left + cols.guest.x + 4, nameY, bold, 9, INK)
    if (row.email && row.name !== row.email) {
      const email = clamp(row.email, regular, 7, cols.guest.w - 10)
      drawText(target, email, MARGIN.left + cols.guest.x + 4, rowBottom + 5, regular, 7, MUTED)
    }

    drawText(target, String(row.quantity), MARGIN.left + cols.qty.x + 4, mid, regular, 9, INK)
    if (cols.class.w) {
      drawText(
        target,
        clamp(row.tierName + comp, regular, 8, cols.class.w - 8),
        MARGIN.left + cols.class.x + 4,
        mid,
        regular,
        8,
        INK,
      )
    }
    if (row.tableLabel) {
      drawText(
        target,
        clamp(row.tableLabel, regular, 8, cols.table.w - 8),
        MARGIN.left + cols.table.x + 4,
        mid,
        regular,
        8,
        INK,
      )
    }

    const box = 9
    const boxX = MARGIN.left + cols.arrived.x + 6
    const boxY = mid - 1
    target.drawRectangle({
      x: boxX,
      y: boxY,
      width: box,
      height: box,
      borderColor: INK,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    })
    if (row.checkedIn >= row.quantity) {
      drawText(target, 'X', boxX + 1.6, boxY + 1.2, bold, 8, INK)
    } else if (row.checkedIn > 0) {
      drawText(target, String(row.checkedIn), boxX + box + 4, mid, regular, 8, MUTED)
    }

    y = rowBottom
  }

  for (const section of blocks) {
    let continued = false
    const openPage = () => {
      startPage(section, continued)
      continued = true
    }
    openPage()
    if (!section.rows.length && page) {
      drawText(page, 'No guests on this list.', MARGIN.left, y - 12, regular, 11, MUTED)
      continue
    }
    section.rows.forEach((row, index) => {
      if (y - rowHeight < MARGIN.bottom + 8) openPage()
      drawGuest(row, index)
    })
  }

  if (page) drawFooter(page, pageIndex, pageSection)

  const bytes = await doc.save()
  return { bytes, filename: filenameFor(show, filenameNote) }
}
