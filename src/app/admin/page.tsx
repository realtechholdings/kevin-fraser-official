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
      <div className="min-h-screen overflow-y-auto bg-slate-100 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{email}</span>. This account
            is not on the admin list.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to site
          </Link>
        </div>
      </div>
    )
  }

  return <AdminPortal />
}
