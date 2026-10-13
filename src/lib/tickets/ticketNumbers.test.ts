import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centsForTickets,
  liveTicketNumbers,
  pickTicketNumbers,
  refundableTicketNumbers,
} from './ticketNumbers'

test('live tickets skip ones already voided', () => {
  const live = liveTicketNumbers({
    quantity: 4,
    voidedTickets: [{ ticket: 2 }, { ticket: 4 }],
  })
  assert.deepEqual(live, [1, 3])
})

test('refundable tickets skip scanned seats', () => {
  const open = refundableTicketNumbers({
    quantity: 3,
    checkedIn: [{ ticket: 1 }],
    voidedTickets: [],
  })
  assert.deepEqual(open, [2, 3])
})

test('pickTicketNumbers keeps the lowest numbers', () => {
  assert.deepEqual(pickTicketNumbers([1, 2, 3, 4], 2), [3, 4])
})

test('centsForTickets puts the remainder on ticket 1 and sums to the total', () => {
  const first = centsForTickets(1000, 3, [1])
  const rest = centsForTickets(1000, 3, [2, 3])
  assert.equal(first + rest, 1000)
  assert.equal(centsForTickets(1000, 3, [2]), 333)
})
