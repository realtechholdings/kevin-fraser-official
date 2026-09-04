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
  name: string
  email: string
  quantity: number
  tierName: string
  tableLabel: string
  source: string
  checkedIn: number
  note: string
}

export type GuestListShowInfo = {
  city: string
  venue: string
  tour: string
  dateLabel: string
  timeLabel: string
}

type GuestOrder = {
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
}

const COLS = {
  num: { x: 0, w: 28 },
  guest: { x: 28, w: 188 },
  qty: { x: 216, w: 36 },
  class: { x: 252, w: 118 },
  table: { x: 370, w: 92 },
  arrived: { x: 462, w: 61 },
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
      return {
        name,
        email: email === 'pending@checkout' ? '' : email,
        quantity: Math.max(1, Number(order.quantity) || 1),
        tierName: String(order.tierName || 'General Admission'),
        tableLabel: tableLabelOf(order),
        source: order.source === 'manual' ? 'comp' : 'paid',
        checkedIn: (order.checkedIn || []).length,
        note: String(order.note || '').trim(),
      }
    })
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      if (byName) return byName
      return a.email.localeCompare(b.email)
    })
}

function clamp(text: string, font: PDFFont, size: number, maxWidth: number) {
  let value = text
  while (value.length > 3 && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = value.slice(0, -1)
  }
  if (value !== text && value.length > 3) value = `${value.slice(0, -1)}…`
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
  page.drawText(text, { x, y, size, font, color })
}

function filenameFor(show: GuestListShowInfo) {
  const date = slugify(show.dateLabel) || 'show'
  const city = slugify(show.city) || 'guest-list'
  return `guest-list-${city}-${date}.pdf`
}

export async function generateGuestListPdf(
  show: GuestListShowInfo,
  rows: GuestListRow[],
): Promise<{ bytes: Uint8Array; filename: string }> {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

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

  function drawFooter(target: PDFPage, index: number) {
    drawText(
      target,
      `Printed ${generated}  ·  ${rows.length} guest${rows.length === 1 ? '' : 's'}  ·  ${tickets} ticket${tickets === 1 ? '' : 's'}`,
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
    const headers: [keyof typeof COLS, string][] = [
      ['num', '#'],
      ['guest', 'Guest'],
      ['qty', 'Qty'],
      ['class', 'Class'],
      ['table', 'Table'],
      ['arrived', 'Arrived'],
    ]
    for (const [key, label] of headers) {
      drawText(target, label, MARGIN.left + COLS[key].x + 4, textY, bold, 8, HEADER_FG)
    }
    return top - headerHeight - 4
  }

  function startPage() {
    if (page) drawFooter(page, pageIndex)
    page = doc.addPage([PAGE.width, PAGE.height])
    pageIndex += 1
    y = PAGE.height - MARGIN.top

    drawText(page, 'KEVIN FRASER', MARGIN.left, y, bold, 11, INK)
    const badge = 'GUEST LIST'
    const badgeW = bold.widthOfTextAtSize(badge, 9)
    page.drawRectangle({
      x: PAGE.width - MARGIN.right - badgeW - 14,
      y: y - 4,
      width: badgeW + 14,
      height: 16,
      color: HEADER_BG,
    })
    drawText(page, badge, PAGE.width - MARGIN.right - badgeW - 7, y, bold, 9, HEADER_FG)
    y -= 22

    drawText(page, `${show.city} · ${show.venue}`, MARGIN.left, y, bold, 16, INK)
    y -= 16
    const meta = [show.dateLabel, show.timeLabel, show.tour].filter(Boolean).join('  ·  ')
    if (meta) {
      drawText(page, meta, MARGIN.left, y, regular, 10, MUTED)
      y -= 14
    }
    const summary = [
      `${rows.length} guest${rows.length === 1 ? '' : 's'}`,
      `${tickets} ticket${tickets === 1 ? '' : 's'}`,
      comps ? `${comps} complimentary` : '',
    ]
      .filter(Boolean)
      .join('  ·  ')
    drawText(page, summary, MARGIN.left, y, regular, 9, MUTED)
    y -= 18
    y = drawColHeaders(page, y)
  }

  startPage()

  rows.forEach((row, index) => {
    if (!page) startPage()
    if (y - rowHeight < MARGIN.bottom + 8) startPage()
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
    drawText(target, String(index + 1), MARGIN.left + COLS.num.x + 4, mid, regular, 9, MUTED)

    const name = clamp(row.name, regular, 9, COLS.guest.w - 10)
    drawText(target, name, MARGIN.left + COLS.guest.x + 4, nameY, bold, 9, INK)
    if (row.email && row.name !== row.email) {
      const email = clamp(row.email, regular, 7, COLS.guest.w - 10)
      drawText(target, email, MARGIN.left + COLS.guest.x + 4, rowBottom + 5, regular, 7, MUTED)
    }

    drawText(target, String(row.quantity), MARGIN.left + COLS.qty.x + 4, mid, regular, 9, INK)
    drawText(
      target,
      clamp(row.tierName + (row.source === 'comp' ? ' (comp)' : ''), regular, 8, COLS.class.w - 8),
      MARGIN.left + COLS.class.x + 4,
      mid,
      regular,
      8,
      INK,
    )
    if (row.tableLabel) {
      drawText(
        target,
        clamp(row.tableLabel, regular, 8, COLS.table.w - 8),
        MARGIN.left + COLS.table.x + 4,
        mid,
        regular,
        8,
        INK,
      )
    }

    const box = 9
    const boxX = MARGIN.left + COLS.arrived.x + 6
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
  })

  if (!rows.length && page) {
    drawText(page, 'No paid guests for this show yet.', MARGIN.left, y - 12, regular, 11, MUTED)
  }

  if (page) drawFooter(page, pageIndex)

  const bytes = await doc.save()
  return { bytes, filename: filenameFor(show) }
}
