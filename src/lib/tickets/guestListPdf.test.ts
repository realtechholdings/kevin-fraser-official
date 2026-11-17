import assert from 'node:assert/strict'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { generateGuestListPdf, guestListSections, type GuestListRow } from './guestListPdf'
import { guestListCsv, guestListFilterNote, parseGuestListQuery } from './loadGuestList'

const show = {
  city: 'Melbourne',
  venue: 'Palais',
  tour: 'DECADANCE',
  dateLabel: 'Friday 18 September 2026',
  timeLabel: '7:30 PM',
}

function guest(patch: Partial<GuestListRow>): GuestListRow {
  return {
    orderId: 'order',
    name: 'Guest',
    email: 'guest@example.com',
    quantity: 1,
    tierName: 'General Admission',
    tableLabel: '',
    source: 'paid',
    checkedIn: 0,
    note: '',
    purchasedAt: null,
    ...patch,
  }
}

test('guest lists run A-Z inside each class, in show order', () => {
  const sections = guestListSections(
    [
      guest({ name: 'Zoe', email: 'zoe@example.com', tierName: 'Floppy Disks' }),
      guest({ name: 'Amy', email: 'amy@example.com', tierName: 'Polaroid People' }),
      guest({ name: 'Bea', email: 'bea@example.com', tierName: 'Floppy Disks' }),
      guest({ name: 'Ned', email: 'ned@example.com', tierName: 'Unknown' }),
    ],
    'class',
    ['Polaroid People', 'Floppy Disks', 'Cassette Club'],
  )

  assert.deepEqual(
    sections.map((section) => section.title),
    ['Polaroid People', 'Floppy Disks', 'Unknown'],
  )
  assert.deepEqual(
    sections.map((section) => section.rows.map((row) => row.name)),
    [['Amy'], ['Bea', 'Zoe'], ['Ned']],
  )
})

test('a single A-Z list ignores class order', () => {
  const sections = guestListSections(
    [
      guest({ name: 'Zoe', tierName: 'Floppy Disks' }),
      guest({ name: 'Amy', tierName: 'Polaroid People' }),
    ],
    'name',
    ['Polaroid People', 'Floppy Disks'],
  )
  assert.equal(sections.length, 1)
  assert.deepEqual(
    sections[0]?.rows.map((row) => row.name),
    ['Amy', 'Zoe'],
  )
})

test('class print starts each class on its own page', async () => {
  const rows = [
    guest({ name: 'Amy', tierName: 'Polaroid People' }),
    guest({ name: 'Bea', tierName: 'Floppy Disks' }),
  ]
  const byClass = await generateGuestListPdf(show, rows, undefined, {
    group: 'class',
    classOrder: ['Polaroid People', 'Floppy Disks'],
  })
  const flat = await generateGuestListPdf(show, rows)

  assert.equal((await PDFDocument.load(byClass.bytes)).getPageCount(), 2)
  assert.equal((await PDFDocument.load(flat.bytes)).getPageCount(), 1)

  const oneClass = Array.from({ length: 20 }, (_, index) =>
    guest({
      name: `Guest ${String.fromCharCode(65 + (index % 26))}${index}`,
      email: `g${index}@example.com`,
      tierName: 'Polaroid People',
      orderId: String(index),
    }),
  )
  const packed = await generateGuestListPdf(show, oneClass, undefined, {
    group: 'class',
    classOrder: ['Polaroid People'],
  })
  assert.equal((await PDFDocument.load(packed.bytes)).getPageCount(), 1)
})

test('export filenames say whether the list is by class', () => {
  const byClass = parseGuestListQuery(new URLSearchParams())
  const flat = parseGuestListQuery(new URLSearchParams('group=name'))
  assert.match(guestListFilterNote(byClass), /by-class/)
  assert.match(guestListFilterNote(flat), /a-z/)
})

test('spreadsheet keeps each class together, class first', () => {
  const csv = guestListCsv(
    show,
    [
      guest({ name: 'Zoe', email: 'zoe@example.com', tierName: 'Floppy Disks', orderId: 'z' }),
      guest({ name: 'Amy', email: 'amy@example.com', tierName: 'Polaroid People', orderId: 'a' }),
      guest({ name: 'Bea', email: 'bea@example.com', tierName: 'Floppy Disks', orderId: 'b' }),
    ],
    { group: 'class', classOrder: ['Polaroid People', 'Floppy Disks'] },
  )
  const lines = csv.body.replace(/^\uFEFF/, '').trim().split('\n')
  assert.equal(
    lines[0],
    'Class,Name,Email,Quantity,Table,Purchased,Source,Checked in,Order ID,Note',
  )
  assert.match(lines[1] || '', /^Polaroid People,Amy,/)
  assert.match(lines[2] || '', /^Floppy Disks,Bea,/)
  assert.match(lines[3] || '', /^Floppy Disks,Zoe,/)
})
