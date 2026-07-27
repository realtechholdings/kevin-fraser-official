import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await currentUser()

  return (
    <div className="min-h-screen overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="border-b border-[var(--border)] bg-[var(--surface)]"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between py-3">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            ← Kevin Fraser
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <main
        className="mx-auto flex max-w-3xl justify-center py-10"
        style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}
      >
        <div className="w-full max-w-lg rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">Your account overview</p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="Avatar" className="h-12 w-12 rounded-full" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-sm font-medium text-[var(--foreground-muted)]">
                  {(user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm text-[var(--foreground-muted)]">Member since</p>
              <p className="mt-1 text-sm font-medium">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Today'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm text-[var(--foreground-muted)]">Account status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
