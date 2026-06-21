import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'
import AIGuide from '@/components/AIGuide'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://kevinfraserofficial.com'),
  title: 'Kevin Fraser Official',
  description: 'Personal brand hub for Kevin Fraser — performer, creator, entrepreneur. Enter the worlds.',
  keywords: ['Kevin Fraser', 'performer', 'Gym & Tonik', 'Kevin11', 'entertainment'],
  openGraph: {
    title: 'Kevin Fraser Official',
    description: 'Enter the worlds of Kevin Fraser — performer, creator, entrepreneur.',
    url: 'https://kevinfraserofficial.com',
    siteName: 'Kevin Fraser Official',
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kevin Fraser Official',
    description: 'Enter the worlds of Kevin Fraser.',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <AIGuide />
        </body>
      </html>
    </ClerkProvider>
  )
}
