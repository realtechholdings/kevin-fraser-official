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
      <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-[#080810] px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0D0D16] px-8 py-10 text-center">
          <h1 className="text-xl font-semibold text-white">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            Signed in as <span className="text-white/80">{email}</span>. This account is not on
            the admin list.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-400"
          >
            Back to site
          </Link>
        </div>
      </div>
    )
  }

  return <AdminPortal />
}
