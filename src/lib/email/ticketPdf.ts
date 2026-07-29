import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const ACCENT = rgb(1, 0.4, 0)
const DARK = rgb(0.05, 0.05, 0.07)
const MUTED = rgb(0.45, 0.45, 0.5)
const LIGHT = rgb(0.92, 0.92, 0.94)

export type TicketPdfInput = {
  orderId: string
  buyerEmail: string
  tourTitle: string
  showTitle: string
  city: string
  venue: string
  address: string
  dateLabel: string
  timeLabel: string
  tierName: string
  quantity: number
}

/** Generate one landscape ticket page per purchased ticket, QR-coded per ticket. */
export async function generateTicketsPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 640
  const pageHeight = 280

  for (let i = 1; i <= input.quantity; i++) {
    const page = doc.addPage([pageWidth, pageHeight])

    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: DARK })
    page.drawRectangle({ x: 0, y: pageHeight - 54, width: pageWidth, height: 54, color: ACCENT })

    page.drawText('KEVIN FRASER', {
      x: 24,
      y: pageHeight - 38,
      size: 20,
      font: bold,
      color: DARK,
    })
    if (input.tourTitle) {
      const tour = input.tourTitle.toUpperCase()
      page.drawText(tour, {
        x: pageWidth - 24 - bold.widthOfTextAtSize(tour, 11),
        y: pageHeight - 36,
        size: 11,
        font: bold,
        color: DARK,
      })
    }

    // QR block on the right
    const qrPng = await QRCode.toBuffer(
      JSON.stringify({ order: input.orderId, ticket: i, of: input.quantity }),
      { margin: 1, width: 240 },
    )
    const qrImage = await doc.embedPng(qrPng)
    const qrSize = 132
    const qrX = pageWidth - qrSize - 28
    const qrY = 48
    page.drawRectangle({
      x: qrX - 8,
      y: qrY - 8,
      width: qrSize + 16,
      height: qrSize + 16,
      color: rgb(1, 1, 1),
    })
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })
    const ticketLabel = `TICKET ${i} OF ${input.quantity}`
    page.drawText(ticketLabel, {
      x: qrX + (qrSize - regular.widthOfTextAtSize(ticketLabel, 9)) / 2,
      y: qrY - 22,
      size: 9,
      font: regular,
      color: MUTED,
    })

    // Main details on the left
    const leftX = 28
    let cursorY = pageHeight - 92

    page.drawText(input.city.toUpperCase(), {
      x: leftX,
      y: cursorY,
      size: 34,
      font: bold,
      color: LIGHT,
    })
    cursorY -= 24

    page.drawText(input.venue, { x: leftX, y: cursorY, size: 13, font: bold, color: LIGHT })
    cursorY -= 16
    if (input.address) {
      page.drawText(input.address, {
        x: leftX,
        y: cursorY,
        size: 10,
        font: regular,
        color: MUTED,
      })
      cursorY -= 18
    } else {
      cursorY -= 6
    }

    page.drawText(`${input.dateLabel}${input.timeLabel ? ` · ${input.timeLabel}` : ''}`, {
      x: leftX,
      y: cursorY,
      size: 12,
      font: regular,
      color: LIGHT,
    })
    cursorY -= 28

    // Tier badge
    const tierText = input.tierName.toUpperCase()
    const tierWidth = bold.widthOfTextAtSize(tierText, 12) + 24
    page.drawRectangle({
      x: leftX,
      y: cursorY - 8,
      width: tierWidth,
      height: 26,
      color: ACCENT,
    })
    page.drawText(tierText, {
      x: leftX + 12,
      y: cursorY,
      size: 12,
      font: bold,
      color: DARK,
    })

    // Footer
    page.drawText(`Order ${input.orderId} · ${input.buyerEmail}`, {
      x: leftX,
      y: 18,
      size: 9,
      font: regular,
      color: MUTED,
    })
  }

  return doc.save()
}
