'use client'

import AIGuide from '@/components/AIGuide'
import ImageMapLanding from '@/components/ImageMapLanding'

export default function HomePage() {
  return (
    <>
      {/* Full-screen image-map landing */}
      <ImageMapLanding />

      {/* AI Guide — always visible bottom-left */}
      <AIGuide />
    </>
  )
}
