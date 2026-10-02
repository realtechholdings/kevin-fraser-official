import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildShowEventJsonLd,
  offsetForWallClock,
  parseClockLabel,
  showPageUrl,
} from './eventSchema'
import type { PublicShow } from '@/lib/serialize'

function show(overrides: Partial<PublicShow> = {}): PublicShow {
  return {
    id: 'abc123',
    tour: { id: 'tour1', title: 'DECADANCE', slug: 'decadance' },
    title: 'DECADANCE (10-Year Celebration)',
    date: '2026-10-03T17:00:00.000',
    doorsTime: '',
    showTime: '5:00 PM',
    showEndTime: '7:00 PM',
    country: 'Australia',
    city: 'Brisbane',
    venue: 'Judith Wright Arts Centre',
    address: '420 Brunswick St',
    currency: 'AUD',
    priceCents: 7500,
    capacity: 400,
    ticketsSold: 10,
    status: 'on_sale',
    ticketsOnSaleAt: null,
    featured: false,
    published: true,
    externalTicketUrl: '',
    artworkImage: '/api/shows/abc123/artwork',
    artworkImageKey: '',
    artworkPosition: 'center center',
    listImage: '',
    listImageKey: '',
    venueImage: '',
    venueImageKey: '',
    description: 'A night of Kevin Fraser in Brisbane.',
    archivedAt: null,
    tiers: [
      {
        id: 'ga',
        ownerType: 'show',
        ownerId: 'abc123',
        name: 'General Admission',
        slug: 'ga',
        description: '',
        currency: 'AUD',
        priceCents: 7500,
        capacity: 300,
        ticketsSold: 10,
        soldOut: false,
        offered: true,
        kind: 'ticket',
        sortOrder: 0,
        published: true,
        ticketAccent: '',
        ticketArtwork: '',
        ticketArtworkKey: '',
      },
      {
        id: 'vip',
        ownerType: 'show',
        ownerId: 'abc123',
        name: 'VIP',
        slug: 'vip',
        description: '',
        currency: 'AUD',
        priceCents: 15000,
        capacity: 20,
        ticketsSold: 20,
        soldOut: false,
        offered: true,
        kind: 'ticket',
        sortOrder: 1,
        published: true,
        ticketAccent: '',
        ticketArtwork: '',
        ticketArtworkKey: '',
      },
    ],
    ...overrides,
  }
}

test('parseClockLabel reads 12-hour and 24-hour labels', () => {
  assert.deepEqual(parseClockLabel('5:00 PM'), { hour: 17, minute: 0 })
  assert.deepEqual(parseClockLabel('12:30 AM'), { hour: 0, minute: 30 })
  assert.deepEqual(parseClockLabel('12pm'), { hour: 12, minute: 0 })
  assert.deepEqual(parseClockLabel('19:30'), { hour: 19, minute: 30 })
  assert.equal(parseClockLabel(''), null)
})

test('Australian offsets follow the city and daylight saving', () => {
  const brisbane = offsetForWallClock('Australia/Brisbane', {
    year: 2026,
    month: 10,
    day: 3,
    hour: 17,
    minute: 0,
    second: 0,
  })
  const sydneySummer = offsetForWallClock('Australia/Sydney', {
    year: 2026,
    month: 1,
    day: 19,
    hour: 19,
    minute: 30,
    second: 0,
  })
  const sydneyWinter = offsetForWallClock('Australia/Sydney', {
    year: 2026,
    month: 7,
    day: 19,
    hour: 19,
    minute: 30,
    second: 0,
  })
  const adelaideSummer = offsetForWallClock('Australia/Adelaide', {
    year: 2026,
    month: 1,
    day: 15,
    hour: 19,
    minute: 30,
    second: 0,
  })
  const perth = offsetForWallClock('Australia/Perth', {
    year: 2026,
    month: 9,
    day: 25,
    hour: 19,
    minute: 30,
    second: 0,
  })

  assert.equal(brisbane, '+10:00')
  assert.equal(sydneySummer, '+11:00')
  assert.equal(sydneyWinter, '+10:00')
  assert.equal(adelaideSummer, '+10:30')
  assert.equal(perth, '+08:00')
})

test('event markup includes date, venue, city, ticket link, and price', () => {
  const data = buildShowEventJsonLd(show())
  assert.equal(data['@type'], 'Event')
  assert.equal(data.startDate, '2026-10-03T17:00:00+10:00')
  assert.equal(data.endDate, '2026-10-03T19:00:00+10:00')
  assert.equal(data.eventStatus, 'https://schema.org/EventScheduled')

  const location = data.location as { name: string; address: { addressLocality: string; addressCountry: string } }
  assert.equal(location.name, 'Judith Wright Arts Centre')
  assert.equal(location.address.addressLocality, 'Brisbane')
  assert.equal(location.address.addressCountry, 'AU')

  const offers = data.offers as { name: string; url: string; price: string; priceCurrency: string; availability: string }[]
  assert.equal(offers.length, 2)
  assert.equal(offers[0].url, showPageUrl('abc123'))
  assert.equal(offers[0].price, '75')
  assert.equal(offers[0].priceCurrency, 'AUD')
  assert.equal(offers[0].availability, 'https://schema.org/InStock')
  assert.equal(offers[1].price, '150')
  assert.equal(offers[1].availability, 'https://schema.org/SoldOut')
  assert.deepEqual(data.image, ['https://kevinfraserofficial.com/api/shows/abc123/artwork'])
})

test('external ticket link, cancellation, and coming soon map to Google statuses', () => {
  const external = buildShowEventJsonLd(
    show({
      externalTicketUrl: 'https://tickets.example/brisbane',
      status: 'cancelled',
      tiers: [],
    }),
  )
  const cancelledOffers = external.offers as { url: string; availability: string }[]
  assert.equal(cancelledOffers[0].url, 'https://tickets.example/brisbane')
  assert.equal(external.eventStatus, 'https://schema.org/EventCancelled')
  assert.equal(cancelledOffers[0].availability, 'https://schema.org/SoldOut')

  const soon = buildShowEventJsonLd(show({ status: 'coming_soon', tiers: [] }))
  const soonOffers = soon.offers as { availability: string; price: string }[]
  assert.equal(soonOffers[0].availability, 'https://schema.org/PreOrder')
  assert.equal(soonOffers[0].price, '75')
})

test('a qualifier in the city name stays on the event and out of the locality', () => {
  const data = buildShowEventJsonLd(
    show({
      city: 'Brisbane (Early Show)',
      showTime: '17:00',
      showEndTime: '',
      date: '2026-10-03T16:00:00.000',
    }),
  )
  assert.equal(data.name, 'DECADANCE (10-Year Celebration) — Early Show')
  assert.equal(data.startDate, '2026-10-03T17:00:00+10:00')
  const location = data.location as { address: { addressLocality: string } }
  assert.equal(location.address.addressLocality, 'Brisbane')
})

test('unknown cities keep the wall-clock time and omit a guessed offset', () => {
  const data = buildShowEventJsonLd(
    show({
      city: 'Smalltown',
      country: 'Australia',
      showTime: '',
      showEndTime: '',
      date: '2026-11-02T19:30:00.000',
      tiers: [],
    }),
  )
  assert.equal(data.startDate, '2026-11-02T19:30:00')
  assert.equal(data.endDate, undefined)
})
