'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

interface WorldContainerProps {
  id: string
  emoji: string
  title: string
  subtitle: string
  color: string
  neonClass: string
  href: string
  external?: boolean
  imageSrc?: string
  videoSrc?: string
  delay?: number
  flickerStyle?: 'slow' | 'fast' | 'breathe'
}

export default function WorldContainer({
  emoji,
  title,
  subtitle,
  color,
  neonClass,
  href,
  external = false,
  imageSrc,
  videoSrc,
  delay = 0,
  flickerStyle = 'slow',
}: WorldContainerProps) {
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const flickerAnimation = {
    slow: { animationName: 'neon-flicker', animationDuration: '3s' },
    fast: { animationName: 'neon-flicker-fast', animationDuration: '1.5s' },
    breathe: { animationName: 'neon-breathe', animationDuration: '2s' },
  }[flickerStyle]

  const containerContent = (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      onHoverStart={() => {
        setHovered(true)
        if (videoRef.current && videoSrc) {
          videoRef.current.src = videoSrc
          videoRef.current.play().catch(() => {})
        }
      }}
      onHoverEnd={() => setHovered(false)}
      className="relative w-full h-full cursor-pointer overflow-hidden rounded-lg group"
      style={{
        background: hovered
          ? `linear-gradient(135deg, #1A1A1A 0%, ${color}22 100%)`
          : 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
        border: `1px solid ${hovered ? color : '#333'}`,
        boxShadow: hovered
          ? `0 0 20px ${color}44, 0 0 40px ${color}22, inset 0 0 20px ${color}11`
          : '0 4px 6px rgba(0,0,0,0.4)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Video / Image background */}
      <div className="absolute inset-0 overflow-hidden">
        {videoSrc ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${hovered ? 'opacity-30' : 'opacity-0'}`}
            onError={() => {}}
          />
        ) : imageSrc ? (
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${hovered ? 'opacity-20' : 'opacity-10'}`}
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : null}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-4xl mb-3 select-none" style={{ filter: hovered ? `drop-shadow(0 0 8px ${color})` : 'none', transition: 'filter 0.3s' }}>
          {emoji}
        </div>

        {/* Neon title */}
        <h2
          className={`text-xl font-black uppercase tracking-widest transition-all duration-300 ${hovered ? neonClass : 'text-gray-400'}`}
          style={
            hovered
              ? {
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'linear',
                  ...flickerAnimation,
                }
              : {}
          }
        >
          {title}
        </h2>

        <p className={`text-xs mt-2 tracking-wider transition-colors duration-300 ${hovered ? 'text-gray-300' : 'text-gray-600'}`}>
          {subtitle}
        </p>

        {/* Enter indicator */}
        <div
          className={`mt-4 text-xs font-semibold tracking-widest uppercase transition-all duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          style={{ color }}
        >
          ENTER →
        </div>
      </div>

      {/* Corner glow accent */}
      {hovered && (
        <div
          className="absolute top-0 right-0 w-16 h-16 rounded-bl-full"
          style={{ background: `radial-gradient(circle at top right, ${color}44, transparent)` }}
        />
      )}
    </motion.div>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {containerContent}
      </a>
    )
  }

  return (
    <Link href={href} className="block h-full">
      {containerContent}
    </Link>
  )
}
