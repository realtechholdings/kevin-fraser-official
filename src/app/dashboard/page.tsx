import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await currentUser()

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Kevin Fraser
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your account overview</p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="Avatar" className="h-12 w-12 rounded-full" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-500">
                  {(user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Member since</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Today'}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Account status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Active</span>
              </div>
            </div>

            <p className="pt-2 text-center text-xs text-slate-400">
              More dashboard features coming soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
