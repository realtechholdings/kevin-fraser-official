'use client'

import Header from '@/components/Header'
import AIGuide from '@/components/AIGuide'
import ImageMapLanding from '@/components/ImageMapLanding'

export default function HomePage() {
  return (
    <>
      {/* Full-screen image-map landing */}
      <ImageMapLanding />

      {/* Header sits above the image */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      {/* AI Guide — always visible bottom-left */}
      <AIGuide />
    </>
  )
}
