import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import mongoose from 'mongoose'

const WaitlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now },
})

const Waitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', WaitlistSchema)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }

    await dbConnect()

    // Check for duplicate
    const existing = await Waitlist.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ success: false, error: "You're already on the list! We'll be in touch." }, { status: 409 })
    }

    await Waitlist.create({ name, email })

    return NextResponse.json({ success: true, message: 'Successfully joined the list!' })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
