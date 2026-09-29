import { auth, currentUser } from '@clerk/nextjs/server'
import {
  BOOTSTRAP_SUPER_ADMINS,
  hasAnyPermission,
  resolveAccess,
  type AdminAccess,
  type AdminPermission,
  type RoleGrant,
} from '@/lib/admin/access'
import { loadRoleGrants } from '@/lib/admin/roles'

export type { AdminAccess, AdminPermission }

function lockedEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...BOOTSTRAP_SUPER_ADMINS, ...fromEnv])]
}

export function accessFromUser(
  emails: string[],
  metadata: unknown,
  roles: readonly RoleGrant[] = [],
): AdminAccess {
  return resolveAccess(emails, metadata, lockedEmails(), roles)
}

export async function resolveUserAccess(emails: string[], metadata: unknown) {
  try {
    const roles = await loadRoleGrants()
    return accessFromUser(emails, metadata, roles)
  } catch (error) {
    console.error('Role catalog unavailable:', error)
    return accessFromUser(emails, metadata, [])
  }
}

export async function requireAdmin(permission?: AdminPermission | readonly AdminPermission[]) {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false as const, status: 401, error: 'Sign in required.' }
  }

  const user = await currentUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Sign in required.' }
  }

  const emails = (user.emailAddresses || []).map((entry) => entry.emailAddress.toLowerCase())
  const access = await resolveUserAccess(emails, user.publicMetadata)

  if (access.permissions.length === 0) {
    return { ok: false as const, status: 403, error: 'Admin access required.' }
  }

  if (permission) {
    const needed = (Array.isArray(permission) ? permission : [permission]) as readonly AdminPermission[]
    if (!hasAnyPermission(access, needed)) {
      return { ok: false as const, status: 403, error: 'You do not have permission to do that.' }
    }
  }

  return { ok: true as const, userId, user, emails, access }
}
