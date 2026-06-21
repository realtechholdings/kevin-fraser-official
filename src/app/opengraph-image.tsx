import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kevin Fraser Official'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0D0D1A 50%, #0A0A14 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            width: '800px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(123,47,247,0.2) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Avatar circle */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '60px',
            background: 'radial-gradient(circle at 30% 30%, #2A2A3A, #0F0F1A)',
            border: '3px solid rgba(123,47,247,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
            marginBottom: '24px',
            boxShadow: '0 0 60px rgba(123,47,247,0.4)',
          }}
        >
          🎭
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 0 40px rgba(123,47,247,0.6)',
            marginBottom: '12px',
          }}
        >
          KEVIN FRASER
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          Enter the worlds
        </div>

        {/* World dots */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '36px' }}>
          {['#FF6B35', '#00D4FF', '#7B2FF7', '#00D4FF', '#FF2D55', '#9B59B6'].map((color, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '6px',
                background: color,
                boxShadow: `0 0 12px ${color}`,
              }}
            />
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '18px',
            color: 'rgba(123,47,247,0.7)',
            letterSpacing: '0.2em',
          }}
        >
          kevinfraserofficial.com
        </div>
      </div>
    ),
    { ...size }
  )
}
