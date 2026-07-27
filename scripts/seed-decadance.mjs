import mongoose from 'mongoose'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI missing')
  process.exit(1)
}

const TourSchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true },
    subtitle: String,
    description: String,
    coverImage: String,
    featured: Boolean,
    published: Boolean,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
)

const ShowSchema = new mongoose.Schema(
  {
    tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    title: String,
    date: Date,
    doorsTime: String,
    showTime: String,
    country: String,
    city: String,
    venue: String,
    address: String,
    currency: String,
    priceCents: Number,
    capacity: Number,
    ticketsSold: Number,
    status: String,
    featured: Boolean,
    published: Boolean,
    externalTicketUrl: String,
  },
  { timestamps: true }
)

const Tour = mongoose.models.Tour || mongoose.model('Tour', TourSchema)
const Show = mongoose.models.Show || mongoose.model('Show', ShowSchema)

const shows = [
  {
    date: '2026-07-24T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Queenstown',
    venue: 'Arrowtown Athenaeum Hall',
    address: '33 Buckingham Street',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
  },
  {
    date: '2026-07-25T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Wellington',
    venue: 'Harbourside Function Venue (The Cable Room)',
    address: '4 Taranaki Street, Te Aro',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
  },
  {
    date: '2026-07-26T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Hawkes Bay',
    venue: 'Century Theatre',
    address: '9 Hershell Street',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
  },
  {
    date: '2026-07-29T19:30:00+12:00',
    country: 'New Zealand',
    city: 'New Plymouth',
    venue: 'Royal Theatre',
    address: '92/100 Devon Street West',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
    featured: true,
  },
  {
    date: '2026-07-30T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Christchurch',
    venue: 'The Piano Theatre',
    address: '156 Armagh Street',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
  },
  {
    date: '2026-08-01T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Tauranga',
    venue: 'The Trinity Auditorium',
    address: '215 Devonport Road',
    currency: 'NZD',
    priceCents: 6500,
    status: 'on_sale',
  },
  {
    date: '2026-08-08T19:30:00+12:00',
    country: 'New Zealand',
    city: 'Auckland',
    venue: 'Skycity Auckland',
    address: 'Corner Victoria and Federal Street',
    currency: 'NZD',
    priceCents: 6500,
    status: 'sold_out',
  },
  {
    date: '2026-09-17T19:30:00+09:30',
    country: 'Australia',
    city: 'Adelaide',
    venue: 'Goodwood Theatre',
    address: '166 Goodwood Rd',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
    featured: true,
  },
  {
    date: '2026-09-18T19:30:00+10:00',
    country: 'Australia',
    city: 'Melbourne',
    venue: 'Clarendon Auditorium',
    address: '1 Convention Centre Pl',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
  },
  {
    date: '2026-09-19T19:30:00+10:00',
    country: 'Australia',
    city: 'Sydney',
    venue: 'Norths Cammeray',
    address: '12 Abbott St, Cammeray',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
  },
  {
    date: '2026-09-25T19:30:00+08:00',
    country: 'Australia',
    city: 'Perth',
    venue: 'Octagon Theatre',
    address: '35 Stirling Hwy, Crawley',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
  },
  {
    date: '2026-10-03T17:00:00+10:00',
    country: 'Australia',
    city: 'Brisbane',
    venue: 'Judith Wright Arts Centre',
    address: '420 Brunswick St & Cnr Berwick St',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
    showTime: '5:00 PM',
    titleSuffix: '5pm Show',
  },
  {
    date: '2026-10-03T19:30:00+10:00',
    country: 'Australia',
    city: 'Brisbane',
    venue: 'Judith Wright Arts Centre',
    address: '420 Brunswick St & Cnr Berwick St',
    currency: 'AUD',
    priceCents: 7500,
    status: 'on_sale',
  },
]

async function main() {
  await mongoose.connect(MONGODB_URI)
  const existing = await Tour.findOne({ slug: 'decadance-10-year-celebration' })
  if (existing) {
    console.log('Decadance tour already exists:', existing._id.toString())
    await mongoose.disconnect()
    return
  }

  const tour = await Tour.create({
    title: 'DECADANCE (10-Year Celebration)',
    slug: 'decadance-10-year-celebration',
    subtitle: 'New Zealand · Australia',
    description:
      'Ten years of Decadance. Kevin Fraser brings the celebration tour across New Zealand and Australia — characters, chaos, and comedy that hits a little too close to home.',
    featured: true,
    published: true,
    startDate: new Date('2026-07-24T00:00:00+12:00'),
    endDate: new Date('2026-10-03T23:59:59+10:00'),
  })

  await Show.insertMany(
    shows.map((s) => ({
      tour: tour._id,
      title: s.titleSuffix
        ? `DECADANCE (10-Year Celebration) — ${s.titleSuffix}`
        : 'DECADANCE (10-Year Celebration)',
      date: new Date(s.date),
      showTime: s.showTime || '7:30 PM',
      country: s.country,
      city: s.city,
      venue: s.venue,
      address: s.address,
      currency: s.currency,
      priceCents: s.priceCents,
      status: s.status,
      featured: Boolean(s.featured),
      published: true,
      capacity: 400,
      ticketsSold: 0,
    }))
  )

  console.log(`Seeded tour ${tour._id.toString()} with ${shows.length} shows`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
