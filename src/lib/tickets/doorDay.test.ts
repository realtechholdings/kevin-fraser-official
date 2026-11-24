import assert from 'node:assert/strict'
import test from 'node:test'
import { isDoorStaff } from '@/lib/admin/access'
import { isShowOnDoorNight } from './doorDay'

test('a show is open on its local date', () => {
  // 07:00 UTC is 18:00 in Sydney during daylight saving.
  const now = new Date('2026-01-15T07:00:00.000Z')
  assert.equal(isShowOnDoorNight('2026-01-15T20:00:00.000', 'Sydney', 'Australia', now), true)
})

test('the door stays open until 6am the next morning', () => {
  // 15:30 UTC is 02:30 the next day in Sydney.
  const now = new Date('2026-01-15T15:30:00.000Z')
  assert.equal(isShowOnDoorNight('2026-01-15T20:00:00.000', 'Sydney', 'Australia', now), true)
})

test('the door closes after 6am the next day', () => {
  // 20:00 UTC is 07:00 the next day in Sydney.
  const now = new Date('2026-01-15T20:00:00.000Z')
  assert.equal(isShowOnDoorNight('2026-01-15T20:00:00.000', 'Sydney', 'Australia', now), false)
})

test('each show follows its own city clock', () => {
  // 22:00 UTC is still 15 January in London, and already the next morning in Sydney.
  const now = new Date('2026-01-15T22:00:00.000Z')
  assert.equal(
    isShowOnDoorNight('2026-01-15T20:00:00.000', 'London', 'United Kingdom', now),
    true,
  )
  assert.equal(isShowOnDoorNight('2026-01-15T20:00:00.000', 'Sydney', 'Australia', now), false)
})

test('a show on another date stays closed', () => {
  const now = new Date('2026-01-15T07:00:00.000Z')
  assert.equal(isShowOnDoorNight('2026-01-16T20:00:00.000', 'Sydney', 'Australia', now), false)
})

test('scanner-only accounts are door staff', () => {
  assert.equal(isDoorStaff({ permissions: ['scanner'] }), true)
  assert.equal(isDoorStaff({ permissions: ['scanner', 'guestlist'] }), true)
  assert.equal(isDoorStaff({ permissions: ['guestlist'] }), false)
  assert.equal(isDoorStaff({ permissions: ['scanner', 'sales'] }), false)
  assert.equal(isDoorStaff({ permissions: ['sales', 'tickets', 'guestlist', 'scanner'] }), false)
})
