import { NextRequest, NextResponse } from 'next/server'
import { KEVIN_PERSONA } from '@/lib/llm/persona'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI Guide unavailable' }, { status: 503 })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kevinfraserofficial.com',
        'X-Title': 'Kevin Fraser Official',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: KEVIN_PERSONA },
          ...messages,
        ],
        stream: true,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'AI service error' }, { status: 502 })
    }

    // Stream the response back
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Guide API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
