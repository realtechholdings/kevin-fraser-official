import assert from 'node:assert/strict'
import test from 'node:test'
import { showPublicPath, showSlugFrom } from './publicPath'

test('show links use the city and date instead of an id', () => {
  assert.equal(showSlugFrom('Pretoria', new Date('2026-11-26T19:00:00.000Z')), 'pretoria-26-nov-2026')
  assert.equal(
    showSlugFrom('Brisbane (Early Show)', new Date('2026-10-03T16:00:00.000Z')),
    'brisbane-early-show-3-oct-2026',
  )
  assert.equal(showPublicPath({ id: '6ac4d21a553b0da784ba1b3e', slug: 'pretoria-26-nov-2026' }), '/worlds/stage/pretoria-26-nov-2026')
  assert.equal(showPublicPath({ id: 'abc', slug: '' }), '/worlds/stage/abc')
})
