'use client'

import { useState } from 'react'
import { UserButton, SignInButton, useUser } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import JoinModal from './JoinModal'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const { isSignedIn } = useUser()

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.9) 0%, transparent 100%)' }}>
        
        {/* Left: Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Right: Join + Account */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setJoinOpen(true)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 hidden sm:block"
            style={{
              background: 'linear-gradient(135deg, #7B2FF7, #5500cc)',
              color: '#fff',
              boxShadow: '0 0 15px rgba(123,47,247,0.4)',
            }}
          >
            Join The List
          </button>
          
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400 hover:border-purple-500 hover:text-white transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Nav Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#111] border-r border-gray-800 p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-white font-black tracking-widest text-sm uppercase">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="text-gray-600 text-sm mt-4">Navigation coming soon...</div>
            <button
              onClick={() => { setMenuOpen(false); setJoinOpen(true) }}
              className="mt-8 w-full py-3 text-xs font-bold uppercase tracking-widest rounded-sm sm:hidden"
              style={{ background: 'linear-gradient(135deg, #7B2FF7, #5500cc)', color: '#fff' }}
            >
              Join The List
            </button>
          </div>
        </div>
      )}

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
