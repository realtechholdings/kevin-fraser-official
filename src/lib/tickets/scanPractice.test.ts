import assert from 'node:assert/strict'
import test from 'node:test'
import { ACTIVE_SHOW_FILTER, isScanPracticeShow } from '../shows/archive'
import { SCAN_PRACTICE_SESSION, isScanPracticeOrder, practiceQrPayload } from './scanPractice'

test('practice QR uses the same payload as a real ticket', () => {
  assert.equal(practiceQrPayload('abc', 2, 4), JSON.stringify({ order: 'abc', ticket: 2, of: 4 }))
})

test('practice orders stay recognizable even when the show is not populated', () => {
  assert.equal(isScanPracticeOrder({ stripeSessionId: SCAN_PRACTICE_SESSION }), true)
  assert.equal(isScanPracticeOrder({ stripeSessionId: 'cs_live_123' }), false)
  assert.equal(
    isScanPracticeOrder({ stripeSessionId: 'cs_live_123', show: { scanPractice: true } }),
    true,
  )
  assert.equal(isScanPracticeShow({ scanPractice: true }), true)
  assert.equal(isScanPracticeShow({}), false)
})

test('public show queries exclude the scanner practice show', () => {
  assert.equal(ACTIVE_SHOW_FILTER.scanPractice.$ne, true)
  assert.equal(ACTIVE_SHOW_FILTER.archivedAt, null)
})
