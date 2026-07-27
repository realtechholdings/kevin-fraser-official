import { auth, currentUser } from '@clerk/nextjs/server'

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false as const, status: 401, error: 'Sign in required.' }
  }

  const user = await currentUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Sign in required.' }
  }

  const emails = (user.emailAddresses || []).map((e) => e.emailAddress.toLowerCase())
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const role = (user.publicMetadata as { role?: string } | undefined)?.role
  const isAdmin =
    role === 'admin' || (adminEmails.length > 0 && emails.some((e) => adminEmails.includes(e)))

  if (!isAdmin) {
    return { ok: false as const, status: 403, error: 'Admin access required.' }
  }

  return { ok: true as const, userId, user, emails }
}
