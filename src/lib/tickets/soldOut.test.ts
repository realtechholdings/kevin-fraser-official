import assert from 'node:assert/strict'
import test from 'node:test'
import {
  areAllTiersSoldOut,
  hasRemainingTableInventory,
  isShowEffectivelySoldOut,
  isTierSoldOut,
  remainingOfferingUnits,
  unsoldTableSeats,
  venueCanTake,
  venueSeatRemaining,
} from './soldOut'

const pretoria = {
  status: 'sold_out',
  capacity: 400,
  ticketsSold: 394,
}

const floppy = {
  published: true,
  kind: 'ticket' as const,
  capacity: 80,
  ticketsSold: 80,
  soldOut: false,
  seats: 1,
}

const polaroid = {
  published: true,
  kind: 'ticket' as const,
  capacity: 200,
  ticketsSold: 200,
  soldOut: false,
  seats: 1,
}

const nokia = {
  published: true,
  kind: 'table' as const,
  capacity: 20,
  ticketsSold: 20,
  soldOut: false,
  seats: 8,
}

const cassette = {
  published: true,
  kind: 'table' as const,
  capacity: 6,
  ticketsSold: 3,
  soldOut: false,
  seats: 10,
}

const pretoriaTiers = [floppy, polaroid, nokia, cassette]

test('Pretoria leftover 6 venue seats do not wipe 10-top Cassette tables', () => {
  const venue = venueSeatRemaining(pretoria)
  assert.equal(venue, 6)
  assert.equal(unsoldTableSeats(pretoriaTiers), 30)
  assert.equal(remainingOfferingUnits(cassette, venue, pretoriaTiers), 3)
  assert.equal(isTierSoldOut(cassette, venue, pretoriaTiers), false)
  assert.equal(hasRemainingTableInventory(pretoriaTiers, venue), true)
  assert.equal(areAllTiersSoldOut(pretoriaTiers, venue), false)
  assert.equal(isShowEffectivelySoldOut({ ...pretoria, tiers: pretoriaTiers }), false)
})

test('ticket classes cannot sell into reserved unsold table seats', () => {
  const venue = venueSeatRemaining(pretoria)
  const polaroidLeft = { ...polaroid, ticketsSold: 190 }
  const tiers = [floppy, polaroidLeft, nokia, cassette]
  assert.equal(isTierSoldOut(polaroidLeft, venue, tiers), true)
  assert.equal(remainingOfferingUnits(polaroidLeft, venue, tiers), 0)
})

test('a table marked sold out is not reserved and does not keep the show on sale', () => {
  const sold = { ...cassette, soldOut: true }
  const tiers = [floppy, polaroid, nokia, sold]
  assert.equal(unsoldTableSeats(tiers), 0)
  assert.equal(hasRemainingTableInventory(tiers, 6), false)
  assert.equal(isShowEffectivelySoldOut({ ...pretoria, tiers }), true)
})

test('venueCanTake subtracts reserved table seats for GA', () => {
  assert.equal(venueCanTake(pretoria, 1, 30), false)
  assert.equal(venueCanTake({ capacity: 400, ticketsSold: 350 }, 1, 30), true)
})

test('Johannesburg-style sold_out with leftover ticket classes stays sold out', () => {
  const show = { status: 'sold_out', capacity: 1007, ticketsSold: 991 }
  const leftoverFloppy = {
    published: true,
    kind: 'ticket' as const,
    capacity: 400,
    ticketsSold: 200,
    soldOut: false,
    seats: 1,
  }
  const soldNokia = {
    published: true,
    kind: 'ticket' as const,
    capacity: 50,
    ticketsSold: 50,
    soldOut: false,
    seats: 1,
  }
  const tiers = [leftoverFloppy, soldNokia]
  const venue = venueSeatRemaining(show)
  assert.equal(hasRemainingTableInventory(tiers, venue), false)
  assert.equal(isShowEffectivelySoldOut({ ...show, tiers }), true)
  assert.equal(isTierSoldOut(leftoverFloppy, venue, tiers), false)
  assert.equal(isTierSoldOut(leftoverFloppy, venue, tiers, 'sold_out'), true)
  assert.equal(isTierSoldOut(soldNokia, venue, tiers, 'sold_out'), true)
})
