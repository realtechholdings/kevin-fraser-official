import assert from 'node:assert/strict'
import test from 'node:test'
import { corporateBookingMessage, parseCorporateBooking } from './corporateBooking'

const valid = {
  name: 'Alex Chen',
  email: 'alex@example.com',
  company: 'Northwind',
  eventType: 'Conference',
  date: '2026-11-14',
  city: 'Sydney',
  audienceSize: '400',
  budget: 'AUD 20,000',
  notes: 'Evening keynote.',
}

test('parseCorporateBooking accepts a complete enquiry', () => {
  const result = parseCorporateBooking(valid)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.booking.email, 'alex@example.com')
  assert.equal(result.booking.audienceSize, 400)
  assert.equal(result.booking.dateLabel.includes('2026'), true)
  const message = corporateBookingMessage(result.booking)
  assert.match(message.subject, /Corporate booking — Sydney/)
  assert.match(message.text, /Audience size: 400/)
  assert.match(message.text, /Budget: AUD 20,000/)
  assert.match(message.text, /Event type: Conference/)
  assert.match(message.text, /Evening keynote/)
})

test('parseCorporateBooking rejects a missing city and an unknown event type', () => {
  const missing = parseCorporateBooking({ ...valid, city: '   ' })
  assert.equal(missing.ok, false)

  const type = parseCorporateBooking({ ...valid, eventType: 'Wedding' })
  assert.equal(type.ok, false)
})
