import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import mongoose from 'mongoose'

const EnquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  inquiryType: { type: String, default: 'Other', trim: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
})

const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const message = String(body.message || '').trim()
    const inquiryType = String(body.inquiryType || 'Other').trim() || 'Other'

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    await dbConnect()
    await Enquiry.create({ name, email, inquiryType, message })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connect API error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong.' }, { status: 500 })
  }
}
