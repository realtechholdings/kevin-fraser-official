import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminPortal from '@/components/admin/AdminPortal'
import { requireAdmin } from '@/lib/admin'

export const metadata: Metadata = {
  title: 'Admin | Kevin Fraser Official',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in?redirect_url=/admin')

  const admin = await requireAdmin()
  if (!admin.ok) {
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress || 'your account'
    return (
      <div
        className="min-h-screen overflow-y-auto flex items-center justify-center px-6"
        style={{ background: '#08080c' }}
      >
        <div className="max-w-md border border-white/10 bg-white/[0.03] px-8 py-10 text-center">
          <h1
            className="text-3xl uppercase text-white"
            style={{ fontFamily: "'Franklin Gothic Extra Condensed', sans-serif" }}
          >
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
            Signed in as <span className="text-zinc-200">{email}</span>. Add this email to{' '}
            <code className="text-[#FF6B35]">ADMIN_EMAILS</code> in your environment, or set Clerk{' '}
            <code className="text-[#FF6B35]">publicMetadata.role = &quot;admin&quot;</code>.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ background: '#FF6B35', color: '#0A0A0A' }}
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return <AdminPortal />
}
