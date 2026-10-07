import assert from 'node:assert/strict'
import test from 'node:test'
import { brandPartnershipMessage, parseBrandPartnership } from './brandPartnership'

const valid = {
  name: 'Priya Nair',
  email: 'priya@example.com',
  brand: 'Northwind Drinks',
  role: 'Marketing lead',
  website: 'northwind.com',
  partnershipType: 'Sponsored content',
  channels: ['Instagram', 'TikTok', 'Not a channel'],
  timeline: 'Q1 2027',
  budget: 'AUD 25,000',
  brief: 'Three short-form videos around the summer launch.',
}

test('parseBrandPartnership accepts a complete enquiry', () => {
  const result = parseBrandPartnership(valid)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.partnership.email, 'priya@example.com')
  assert.equal(result.partnership.website, 'https://northwind.com/')
  assert.deepEqual(result.partnership.channels, ['Instagram', 'TikTok'])
  const message = brandPartnershipMessage(result.partnership)
  assert.match(message.subject, /Brand partnership — Northwind Drinks · Sponsored content/)
  assert.match(message.text, /Channels: Instagram, TikTok/)
  assert.match(message.text, /Budget: AUD 25,000/)
  assert.match(message.text, /Timeline: Q1 2027/)
  assert.match(message.text, /summer launch/)
})

test('parseBrandPartnership rejects a missing brand, unknown type, and bad website', () => {
  assert.equal(parseBrandPartnership({ ...valid, brand: '  ' }).ok, false)
  assert.equal(parseBrandPartnership({ ...valid, partnershipType: 'Wedding' }).ok, false)
  assert.equal(parseBrandPartnership({ ...valid, brief: '' }).ok, false)
  assert.equal(parseBrandPartnership({ ...valid, website: 'not a url' }).ok, false)
  assert.equal(parseBrandPartnership({ ...valid, website: '' }).ok, true)
})
