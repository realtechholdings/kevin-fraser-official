import assert from 'node:assert/strict'
import test from 'node:test'
import { maxTablesPerOrder } from './limits'

test('a 10-seat Cassette table with 6 in stock can be bought up to 6', () => {
  assert.equal(maxTablesPerOrder(10, 6), 6)
})

test('an 8-seat table is limited by stock, not the old 20-ticket cap', () => {
  assert.equal(maxTablesPerOrder(8, 4), 4)
})

test('one table left stays one', () => {
  assert.equal(maxTablesPerOrder(10, 1), 1)
})
