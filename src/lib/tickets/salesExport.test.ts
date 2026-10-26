import assert from 'node:assert/strict'
import test from 'node:test'
import { toWinAnsi, buildGuestListRows } from './guestListPdf'
import { publicTierDescription } from './tierCopy'
import { compsCsv, refundedCentsOf, refundsCsv, salesCsv, type ExportOrder } from './salesExport'

test('public descriptions drop a trailing colour code', () => {
  assert.equal(
    publicTierDescription('Seating at Sideview Block A. #00FF1E'),
    'Seating at Sideview Block A.',
  )
  assert.equal(publicTierDescription('Sideview Block E.'), 'Sideview Block E.')
})

test('guest-list print text stays inside WinAnsi', () => {
  assert.equal(toWinAnsi('Dial Up… “Block A” – left'), 'Dial Up... "Block A" - left')
  assert.equal(toWinAnsi('café'), 'café')
  assert.equal(toWinAnsi('name\u2026'), 'name...')
})

test('printed guest lists use the booking name', () => {
  const rows = buildGuestListRows([
    { holderName: 'Ada Lovelace', email: 'ada@example.com', quantity: 2, status: 'paid' },
    { holderName: '', email: 'old@example.com', quantity: 1, status: 'paid' },
  ])
  assert.equal(rows[0]?.name, 'Ada Lovelace')
  assert.equal(rows[1]?.name, 'old@example.com')
})

function order(patch: Partial<ExportOrder>): ExportOrder {
  return {
    id: 'order',
    createdAt: '2026-10-01T00:00:00.000Z',
    email: 'guest@example.com',
    holderName: 'Guest',
    quantity: 2,
    liveQuantity: 2,
    tierName: 'Dial Up',
    tableQuantity: 0,
    tableNames: [],
    amountTotal: 10000,
    currency: 'ZAR',
    status: 'paid',
    source: 'stripe',
    note: '',
    refundedAt: null,
    refundedCents: 0,
    upgradedFrom: false,
    transferFrom: false,
    show: { city: 'Durban', venue: 'Dial Up', dateLabel: 'Sat 3 OCT', archived: false },
    ...patch,
  }
}

test('a full refund with no stored amount still exports the original charge', () => {
  assert.equal(refundedCentsOf({ status: 'refunded', amountTotal: 341500, refundedCents: 0 }), 341500)
  assert.equal(refundedCentsOf({ status: 'paid', amountTotal: 10000, refundedCents: 38000 }), 38000)
  assert.equal(refundedCentsOf({ status: 'paid', amountTotal: 10000, refundedCents: 0 }), 0)
})

test('sales export keeps charges and drops moved tickets', () => {
  const csv = salesCsv([
    order({ id: 'sale' }),
    order({
      id: 'moved',
      status: 'transferred',
      amountTotal: 20000,
      liveQuantity: 0,
      quantity: 2,
    }),
    order({
      id: 'comp',
      source: 'manual',
      amountTotal: 0,
      holderName: 'Comp',
    }),
    order({
      id: 'difference',
      transferFrom: true,
      amountTotal: 5000,
      liveQuantity: 2,
    }),
  ])
  assert.match(csv, /,sale\n/)
  assert.match(csv, /moved,.*Dial Up,0,0,,ZAR,200\.00,0\.00,200\.00,transferred/)
  assert.doesNotMatch(csv, /^comp,/m)
  assert.match(csv, /transfer difference/)
})

test('comps and refunds export separately', () => {
  const comp = order({
    id: 'comp',
    source: 'manual',
    amountTotal: 0,
    status: 'paid',
    note: 'guest',
  })
  const refund = order({
    id: 'refund',
    status: 'refunded',
    amountTotal: 20000,
    refundedCents: 0,
    refundedAt: '2026-10-02T00:00:00.000Z',
    liveQuantity: 0,
  })
  const voided = order({
    id: 'void',
    source: 'manual',
    amountTotal: 0,
    status: 'refunded',
    quantity: 20,
  })
  const comps = compsCsv([comp, refund])
  assert.match(comps, /^comp,/m)
  assert.doesNotMatch(comps, /^refund,/m)
  const refunds = refundsCsv([refund, voided, order({ id: 'open' })])
  assert.match(refunds, /^refund,.*ZAR,200\.00,refund/m)
  assert.match(refunds, /^void,.*ZAR,0\.00,complimentary void/m)
  assert.doesNotMatch(refunds, /^open,/m)
})
