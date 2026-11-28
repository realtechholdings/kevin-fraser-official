import assert from 'node:assert/strict'
import test from 'node:test'
import {
  admissionCounts,
  bookingGroupKey,
  bookingLine,
  buildAdmissionHistory,
  clampAdmitQuantity,
  legacyCheckedInTickets,
  orderMatchesDoorSearch,
  parseDoorSearch,
  parseScanCode,
  pickAdmitTickets,
  type AdmissionOrder,
  type LedgerRecord,
} from './admissions'

const ORDER_ID = '665f1c2ab3d4e5f6a7b8c9d0'

function order(overrides: Partial<AdmissionOrder> = {}): AdmissionOrder {
  return {
    _id: ORDER_ID,
    email: 'joseph@example.com',
    holderName: 'Joseph Smith',
    tierName: 'General Admission',
    quantity: 6,
    status: 'paid',
    ...overrides,
  }
}

test('a group of six with three inside has three remaining', () => {
  const counts = admissionCounts(
    order({ checkedIn: [{ ticket: 1 }, { ticket: 2 }, { ticket: 3 }] }),
  )
  assert.deepEqual(
    { purchased: counts.purchased, admitted: counts.admitted, remaining: counts.remaining },
    { purchased: 6, admitted: 3, remaining: 3 },
  )
  assert.deepEqual(counts.open, [4, 5, 6])
})

test('refunded tickets leave the allocation and a double scan counts once', () => {
  const counts = admissionCounts(
    order({
      voidedTickets: [{ ticket: 6, reason: 'refunded' }],
      checkedIn: [{ ticket: 1 }, { ticket: 1 }, { ticket: 6 }],
    }),
  )
  assert.equal(counts.purchased, 5)
  assert.equal(counts.admitted, 1)
  assert.equal(counts.remaining, 4)
})

test('admitting takes the scanned ticket first, then the lowest numbers', () => {
  assert.deepEqual(pickAdmitTickets([1, 2, 3, 4, 5, 6], 3), [1, 2, 3])
  assert.deepEqual(pickAdmitTickets([1, 2, 3, 4, 5, 6], 3, 5), [1, 2, 5])
  // The scanned ticket is already inside, so it is not used again.
  assert.deepEqual(pickAdmitTickets([4, 5, 6], 2, 1), [4, 5])
})

test('asking for more than is left picks nothing', () => {
  assert.deepEqual(pickAdmitTickets([5, 6], 3), [])
  assert.deepEqual(pickAdmitTickets([5, 6], 0), [])
})

test('a line shows its class, table and allocation', () => {
  const line = bookingLine(
    order({ tierName: 'VIP', tableNames: ['Table 3', 'Table 4'], checkedIn: [{ ticket: 2 }] }),
  )
  assert.equal(line.tierName, 'VIP')
  assert.equal(line.tableName, 'Table 3, Table 4')
  assert.equal(line.ref, 'A7B8C9D0')
  assert.deepEqual([line.purchased, line.admitted, line.remaining], [6, 1, 5])
  assert.equal(line.state, 'open')
})

test('a refunded or moved order has nothing left to admit', () => {
  assert.equal(bookingLine(order({ status: 'refunded' })).state, 'refunded')
  assert.equal(bookingLine(order({ status: 'refunded' })).remaining, 0)
  assert.equal(bookingLine(order({ status: 'transferred' })).state, 'transferred')
  assert.equal(bookingLine(order({ status: 'pending' })).state, 'not_paid')
  const allUpgraded = order({
    quantity: 2,
    voidedTickets: [
      { ticket: 1, reason: 'upgraded' },
      { ticket: 2, reason: 'upgraded' },
    ],
  })
  assert.equal(bookingLine(allUpgraded).state, 'upgraded')
})

test('one guest with two ticket classes is one booking; comps under one email are not', () => {
  const ga = order({ tierName: 'General Admission' })
  const vip = order({ tierName: 'VIP', holderName: '  joseph   SMITH ' })
  assert.equal(bookingGroupKey(ga), bookingGroupKey(vip))

  const compA = order({ email: 'door@kevinfraser.com', holderName: 'Sarah Jones' })
  const compB = order({ email: 'door@kevinfraser.com', holderName: 'Tom Lee' })
  assert.notEqual(bookingGroupKey(compA), bookingGroupKey(compB))

  assert.equal(bookingGroupKey(order({ email: 'pending@checkout' })), null)
})

test('search finds a guest by name in any order, by email, and without accents', () => {
  const guest = order({ holderName: 'José Smith-Álvarez', tableNames: ['Table 12'] })
  const match = (q: string) => {
    const search = parseDoorSearch(q)
    return Boolean(search && orderMatchesDoorSearch(guest, search))
  }
  assert.equal(match('jose'), true)
  assert.equal(match('SMITH jose'), true)
  assert.equal(match('alvarez'), true)
  assert.equal(match('joseph@example'), true)
  assert.equal(match('table 12'), true)
  assert.equal(match('josephine'), false)
  assert.equal(match('jose brown'), false)
  assert.equal(match('j'), false)
})

test('search finds a booking by full reference or its last characters', () => {
  const guest = order()
  const match = (q: string) => {
    const search = parseDoorSearch(q)
    return Boolean(search && orderMatchesDoorSearch(guest, search))
  }
  assert.equal(match(ORDER_ID), true)
  assert.equal(match('A7B8C9D0'), true)
  assert.equal(match('#a7b8c9d0'), true)
  assert.equal(match('b8c9d0'), true)
  // The front of an order ID is a timestamp shared by many orders.
  assert.equal(match('665f1c2a'), false)
})

test('the camera reads ticket codes and bare order ids, and nothing else', () => {
  assert.deepEqual(parseScanCode(JSON.stringify({ order: ORDER_ID, ticket: 2, of: 6 })), {
    orderId: ORDER_ID,
    ticket: 2,
  })
  assert.deepEqual(parseScanCode(ORDER_ID), { orderId: ORDER_ID, ticket: null })
  assert.deepEqual(parseScanCode(JSON.stringify({ order: ORDER_ID })), {
    orderId: ORDER_ID,
    ticket: null,
  })
  // A ticket number that is present but nonsense must not become "any ticket".
  assert.equal(parseScanCode(JSON.stringify({ order: ORDER_ID, ticket: 'x' }))?.ticket, -1)
  assert.equal(parseScanCode('https://example.com/menu'), null)
  assert.equal(parseScanCode(JSON.stringify({ order: 'nope', ticket: 1 })), null)
  assert.equal(parseScanCode(''), null)
  assert.equal(parseScanCode(undefined), null)
})

test('history shows who admitted how many, and a reversal on the entry it cancelled', () => {
  const records: LedgerRecord[] = [
    {
      id: 'a1',
      orderId: ORDER_ID,
      kind: 'admit',
      quantity: 4,
      tierName: 'General Admission',
      usherName: 'Jane Doe',
      method: 'scan',
      at: '2026-11-28T09:00:00.000Z',
      reverses: null,
    },
    {
      id: 'r1',
      orderId: ORDER_ID,
      kind: 'reversal',
      quantity: 4,
      tierName: 'General Admission',
      usherName: 'Sam Supervisor',
      at: '2026-11-28T09:02:00.000Z',
      reverses: 'a1',
      reason: 'Only three arrived',
    },
    {
      id: 'a2',
      orderId: ORDER_ID,
      kind: 'admit',
      quantity: 3,
      tierName: 'General Admission',
      usherName: 'Jane Doe',
      method: 'search',
      at: '2026-11-28T09:03:00.000Z',
      reverses: null,
    },
  ]
  const history = buildAdmissionHistory(
    [order({ checkedIn: [1, 2, 3].map((ticket) => ({ ticket, admission: 'a2' })) })],
    records,
  )
  assert.equal(history.length, 2)
  assert.equal(history[0].id, 'a2')
  assert.equal(history[0].reversed, null)
  assert.equal(history[0].method, 'search')
  assert.equal(history[1].id, 'a1')
  assert.deepEqual(history[1].reversed, {
    by: 'Sam Supervisor',
    at: '2026-11-28T09:02:00.000Z',
    reason: 'Only three arrived',
  })
})

test('check-ins from before the ledger appear once per order with no usher', () => {
  const legacy = order({
    checkedIn: [
      { ticket: 1, at: '2026-11-27T10:00:00.000Z' },
      { ticket: 2, at: '2026-11-27T10:05:00.000Z' },
      { ticket: 3, at: '2026-11-28T09:00:00.000Z', admission: 'a1' },
    ],
  })
  assert.deepEqual(legacyCheckedInTickets(legacy), [1, 2])
  const history = buildAdmissionHistory([legacy], [])
  assert.equal(history.length, 1)
  assert.equal(history[0].id, `legacy:${ORDER_ID}`)
  assert.equal(history[0].legacy, true)
  assert.equal(history[0].quantity, 2)
  assert.equal(history[0].usherName, '')
  assert.equal(history[0].at, '2026-11-27T10:05:00.000Z')
})

test('the quantity stepper stays between nothing and what is left', () => {
  assert.equal(clampAdmitQuantity(2, 3), 2)
  assert.equal(clampAdmitQuantity(9, 3), 3)
  assert.equal(clampAdmitQuantity(-1, 3), 0)
  assert.equal(clampAdmitQuantity(1, 0), 0)
})
