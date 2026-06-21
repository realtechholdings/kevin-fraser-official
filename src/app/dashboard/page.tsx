import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await currentUser()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
          ← KEVIN FRASER
        </Link>
        <UserButton />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-full max-w-lg rounded-lg p-8"
          style={{
            background: '#111',
            border: '1px solid rgba(123,47,247,0.2)',
            boxShadow: '0 0 40px rgba(123,47,247,0.1)',
          }}
        >
          <h1
            className="text-2xl font-black uppercase tracking-widest mb-2"
            style={{
              color: '#7B2FF7',
              textShadow: '0 0 20px rgba(123,47,247,0.5)',
            }}
          >
            Dashboard
          </h1>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="Avatar" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                  👤
                </div>
              )}
              <div>
                <p className="text-white font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-gray-500 text-sm">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
            >
              <p className="text-gray-400 text-sm">Member since</p>
              <p className="text-white text-sm font-semibold mt-1">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-AU', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) : 'Today'}
              </p>
            </div>

            <div
              className="rounded-lg p-4"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
            >
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Account Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
                <span className="text-green-400 text-sm font-semibold">Active</span>
              </div>
            </div>

            <p className="text-gray-600 text-xs text-center mt-4">
              More dashboard features coming soon — you&apos;re in early!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
