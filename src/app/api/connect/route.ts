import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import mongoose from 'mongoose'

const EnquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema)

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 })
    }

    await dbConnect()
    await Enquiry.create({ name, email, message })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connect API error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 })
  }
}
