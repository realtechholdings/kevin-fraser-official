import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/settings/getSiteSettings'
import { buildGuideSystemPrompt } from '@/lib/settings/defaults'
import {
  GUIDE_MAX_TOKENS,
  checkGuideRateLimit,
  clientIpFromRequest,
  sanitizeGuideMessages,
} from '@/lib/llm/guideSafety'

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req)
    const limited = checkGuideRateLimit(ip)
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        },
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const messages = sanitizeGuideMessages(
      body && typeof body === 'object' ? (body as { messages?: unknown }).messages : undefined,
    )

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No valid messages' }, { status: 400 })
    }

    // Require a real user turn — blocks pure assistant-spoof / empty abuse payloads.
    if (messages[messages.length - 1]?.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI Guide unavailable' }, { status: 503 })
    }

    const settings = await getSiteSettings()
    const systemPrompt = buildGuideSystemPrompt(settings.ai)

    // Only server-built system + sanitized user/assistant history — never client "system" roles.
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kevinfraserofficial.com',
        'X-Title': 'Kevin Fraser Official',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: GUIDE_MAX_TOKENS,
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Guide API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
