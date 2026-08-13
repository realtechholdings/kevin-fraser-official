import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import QRCode from 'qrcode'

const DEFAULT_ACCENT = rgb(1, 0.4, 0)
const DARK = rgb(0.05, 0.05, 0.07)
const MUTED = rgb(0.45, 0.45, 0.5)
const LIGHT = rgb(0.92, 0.92, 0.94)
const WHITE = rgb(1, 1, 1)

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
  /** Hex accent for header + tier badge (e.g. #FF6600) */
  accentHex?: string
  /** Optional PNG/JPEG bytes for left-side artwork */
  artworkBytes?: Uint8Array
}

function parseHexColor(hex: string | undefined): RGB {
  if (!hex) return DEFAULT_ACCENT
  const cleaned = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return DEFAULT_ACCENT
  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255
  return rgb(r, g, b)
}

/** Dark ink on light accents, light ink on dark accents. */
function inkForAccent(accent: RGB): RGB {
  const luminance = 0.2126 * accent.red + 0.7152 * accent.green + 0.0722 * accent.blue
  return luminance > 0.55 ? DARK : WHITE
}

function drawClampedText(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: RGB; maxWidth: number },
) {
  let value = text
  while (value.length > 3 && opts.font.widthOfTextAtSize(value, opts.size) > opts.maxWidth) {
    value = value.slice(0, -1)
  }
  if (value !== text && value.length > 3) value = `${value.slice(0, -1)}…`
  page.drawText(value, {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
  })
}

/** Generate one landscape ticket page per purchased ticket, QR-coded per ticket. */
export async function generateTicketsPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const accent = parseHexColor(input.accentHex)
  const accentInk = inkForAccent(accent)

  let artworkImage:
    | Awaited<ReturnType<PDFDocument['embedPng']>>
    | Awaited<ReturnType<PDFDocument['embedJpg']>>
    | null = null
  if (input.artworkBytes?.length) {
    try {
      artworkImage = await doc.embedPng(input.artworkBytes)
    } catch {
      try {
        artworkImage = await doc.embedJpg(input.artworkBytes)
      } catch {
        artworkImage = null
      }
    }
  }

  const pageWidth = 640
  const pageHeight = 280
  const artWidth = artworkImage ? 148 : 0

  for (let i = 1; i <= input.quantity; i++) {
    const page = doc.addPage([pageWidth, pageHeight])

    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: DARK })
    page.drawRectangle({ x: 0, y: pageHeight - 54, width: pageWidth, height: 54, color: accent })

    page.drawText('KEVIN FRASER', {
      x: 24,
      y: pageHeight - 38,
      size: 20,
      font: bold,
      color: accentInk,
    })
    if (input.tourTitle) {
      const tour = input.tourTitle.toUpperCase()
      page.drawText(tour, {
        x: pageWidth - 24 - bold.widthOfTextAtSize(tour, 11),
        y: pageHeight - 36,
        size: 11,
        font: bold,
        color: accentInk,
      })
    }

    if (artworkImage) {
      const panelH = pageHeight - 54
      page.drawImage(artworkImage, {
        x: 0,
        y: 0,
        width: artWidth,
        height: panelH,
      })
      page.drawRectangle({
        x: artWidth,
        y: 0,
        width: 2,
        height: panelH,
        color: accent,
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
      color: WHITE,
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

    // Main details on the left (after artwork if present)
    const leftX = 28 + artWidth
    const textMax = qrX - 24 - leftX
    let cursorY = pageHeight - 92

    drawClampedText(page, input.city.toUpperCase(), {
      x: leftX,
      y: cursorY,
      size: 34,
      font: bold,
      color: LIGHT,
      maxWidth: textMax,
    })
    cursorY -= 24

    drawClampedText(page, input.venue, {
      x: leftX,
      y: cursorY,
      size: 13,
      font: bold,
      color: LIGHT,
      maxWidth: textMax,
    })
    cursorY -= 16
    if (input.address) {
      drawClampedText(page, input.address, {
        x: leftX,
        y: cursorY,
        size: 10,
        font: regular,
        color: MUTED,
        maxWidth: textMax,
      })
      cursorY -= 18
    } else {
      cursorY -= 6
    }

    drawClampedText(page, `${input.dateLabel}${input.timeLabel ? ` · ${input.timeLabel}` : ''}`, {
      x: leftX,
      y: cursorY,
      size: 12,
      font: regular,
      color: LIGHT,
      maxWidth: textMax,
    })
    cursorY -= 28

    // Tier badge
    const tierText = input.tierName.toUpperCase()
    const tierWidth = Math.min(textMax, bold.widthOfTextAtSize(tierText, 12) + 24)
    page.drawRectangle({
      x: leftX,
      y: cursorY - 8,
      width: tierWidth,
      height: 26,
      color: accent,
    })
    page.drawText(tierText, {
      x: leftX + 12,
      y: cursorY,
      size: 12,
      font: bold,
      color: accentInk,
    })

    // Footer
    drawClampedText(page, `Order ${input.orderId} · ${input.buyerEmail}`, {
      x: leftX,
      y: 18,
      size: 9,
      font: regular,
      color: MUTED,
      maxWidth: textMax,
    })
  }

  return doc.save()
}
