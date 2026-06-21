'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import WorldContainer from '@/components/WorldContainer'

const WORLDS = [
  {
    id: 'stage',
    emoji: '🎭',
    title: 'The Stage',
    subtitle: 'Live Events · Tours · Tickets',
    color: '#FF6B35',
    neonClass: 'neon-text-orange',
    href: '/worlds/stage',
    flickerStyle: 'slow' as const,
    delay: 0.1,
  },
  {
    id: 'showreel',
    emoji: '🎬',
    title: 'The Showreel',
    subtitle: 'Video · Reels · Media',
    color: '#00D4FF',
    neonClass: 'neon-text-blue',
    href: '/worlds/showreel',
    flickerStyle: 'breathe' as const,
    delay: 0.2,
  },
  {
    id: 'studio',
    emoji: '🎵',
    title: 'The Studio',
    subtitle: 'Music · Production · Creative',
    color: '#7B2FF7',
    neonClass: 'neon-text-purple',
    href: '/worlds/studio',
    flickerStyle: 'breathe' as const,
    delay: 0.3,
  },
  {
    id: 'gym',
    emoji: '💪',
    title: 'Gym & Tonik',
    subtitle: 'Fitness Community App',
    color: '#00D4FF',
    neonClass: 'neon-text-blue',
    href: 'https://gym-and-tonic.vercel.app/',
    external: true,
    flickerStyle: 'slow' as const,
    delay: 0.4,
  },
  {
    id: 'kevin11',
    emoji: '🔴',
    title: 'Kevin11',
    subtitle: 'Sports · Footy · Community',
    color: '#FF2D55',
    neonClass: 'neon-text-red',
    href: '/worlds/kevin11',
    flickerStyle: 'fast' as const,
    delay: 0.5,
  },
  {
    id: 'connect',
    emoji: '🌐',
    title: 'Connect',
    subtitle: 'Contact · Social · Bookings',
    color: '#9B59B6',
    neonClass: 'neon-text-violet',
    href: '/worlds/connect',
    flickerStyle: 'slow' as const,
    delay: 0.6,
  },
]

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleParallax = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    const x = (clientX / innerWidth - 0.5) * 20
    const y = (clientY / innerHeight - 0.5) * 10
    const bg = containerRef.current.querySelector('.parallax-bg') as HTMLElement
    if (bg) {
      bg.style.transform = `translate(${x}px, ${y}px) scale(1.05)`
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#0A0A0A' }}
      onMouseMove={handleParallax}
    >
      {/* Parallax city backdrop */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
      >
        <div
          className="parallax-bg absolute inset-[-5%] transition-transform duration-100 ease-out"
          style={{
            background: `
              radial-gradient(ellipse 80% 40% at 50% 100%, rgba(123,47,247,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 60% 30% at 30% 80%, rgba(0,212,255,0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 30% at 70% 80%, rgba(255,107,53,0.06) 0%, transparent 50%),
              linear-gradient(to bottom, #0A0A0A 0%, #0D0D12 40%, #0A0A14 70%, #0A0A0A 100%)
            `,
          }}
        />

        {/* City skyline silhouette */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '35vh',
            background: `
              linear-gradient(to top, #0A0A0A 0%, transparent 100%)
            `,
          }}
        />

        {/* Building silhouettes */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
          style={{ height: '30vh', opacity: 0.3 }}
        >
          <path
            d="M0,300 L0,180 L40,180 L40,120 L60,120 L60,80 L80,80 L80,120 L100,120 L100,180 L140,180 L140,100 L160,100 L160,60 L180,60 L180,40 L200,40 L200,60 L220,60 L220,100 L260,100 L260,150 L300,150 L300,80 L320,80 L320,50 L340,50 L340,30 L360,30 L360,50 L380,50 L380,80 L420,80 L420,130 L460,130 L460,70 L480,70 L480,30 L500,30 L500,10 L520,10 L520,30 L540,30 L540,70 L580,70 L580,120 L620,120 L620,60 L640,60 L640,20 L660,20 L660,0 L680,0 L680,20 L700,20 L700,60 L740,60 L740,110 L780,110 L780,70 L800,70 L800,40 L820,40 L820,70 L840,70 L840,110 L880,110 L880,80 L900,80 L900,50 L920,50 L920,80 L940,80 L940,110 L980,110 L980,150 L1020,150 L1020,90 L1040,90 L1040,60 L1060,60 L1060,40 L1080,40 L1080,60 L1100,60 L1100,90 L1140,90 L1140,130 L1180,130 L1180,80 L1200,80 L1200,50 L1220,50 L1220,80 L1240,80 L1240,130 L1280,130 L1280,160 L1320,160 L1320,100 L1340,100 L1340,70 L1360,70 L1360,100 L1380,100 L1380,160 L1440,160 L1440,300 Z"
            fill="#1A1A2E"
          />
        </svg>

        {/* Ambient stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
              opacity: Math.random() * 0.6 + 0.1,
              animation: `neon-breathe ${Math.random() * 3 + 2}s infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <Header />

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 pb-8 px-4">
        
        {/* Central plinth area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="text-center mb-8 sm:mb-12"
        >
          {/* Plinth glow */}
          <div
            className="inline-block mb-6 relative"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(123,47,247,0.4))',
            }}
          >
            {/* Kevin avatar placeholder */}
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto flex items-center justify-center text-5xl sm:text-6xl relative"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #2A2A3A, #0F0F1A)',
                border: '2px solid rgba(123,47,247,0.4)',
                boxShadow: '0 0 40px rgba(123,47,247,0.3), 0 0 80px rgba(123,47,247,0.1)',
                animation: 'pulse-glow 3s infinite',
              }}
            >
              🎭
            </div>

            {/* Plinth platform */}
            <div
              className="mt-2 mx-auto"
              style={{
                width: '80px',
                height: '12px',
                background: 'linear-gradient(to bottom, #3A3A4A, #1A1A2A)',
                borderRadius: '2px',
                boxShadow: '0 4px 20px rgba(123,47,247,0.3)',
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-gray-400 text-sm tracking-widest uppercase mb-1">Welcome to the world of</p>
            <h2
              className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white"
              style={{ textShadow: '0 0 30px rgba(123,47,247,0.5)' }}
            >
              Kevin Fraser
            </h2>
            <p className="text-gray-500 text-xs mt-2 tracking-widest">Choose your world below</p>
          </motion.div>
        </motion.div>

        {/* World Containers Grid */}
        <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {WORLDS.map(world => (
            <div key={world.id} className="h-44 sm:h-52">
              <WorldContainer {...world} />
            </div>
          ))}
        </div>

        {/* Explore / AI Guide trigger */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => (window as any).__openAIGuide?.()}
          className="mt-10 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-xs tracking-widest uppercase"
          style={{ animation: 'float 3s ease-in-out infinite' }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: '#7B2FF7',
              boxShadow: '0 0 8px #7B2FF7',
              animation: 'neon-breathe 2s infinite',
            }}
          />
          Explore
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: '#7B2FF7',
              boxShadow: '0 0 8px #7B2FF7',
              animation: 'neon-breathe 2s infinite 0.5s',
            }}
          />
        </motion.button>
      </main>
    </div>
  )
}
