/** Staff access for the admin console. Enforced on the server; the UI only hides what this already blocks. */

export const BOOTSTRAP_SUPER_ADMINS = ['stuartjacobsau@gmail.com']

export const ADMIN_PERMISSIONS = [
  'sales',
  'tickets',
  'refunds',
  'guestlist',
  'scanner',
  'tours',
  'shows',
  'tiers',
  'cms',
  'website',
  'site',
  'users',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

export const ASSIGNABLE_PERMISSIONS: {
  id: AdminPermission
  label: string
  description: string
}[] = [
  { id: 'sales', label: 'Sales & customers', description: 'Look up orders and buyers' },
  { id: 'tickets', label: 'Tickets', description: 'Issue, resend, download, and upgrade tickets' },
  { id: 'refunds', label: 'Refunds', description: 'Refund payments and void tickets' },
  { id: 'guestlist', label: 'Guest lists', description: 'View and print door lists' },
  { id: 'scanner', label: 'Scanner', description: 'Check guests in at the door' },
  { id: 'tours', label: 'Tours', description: 'Create and edit tours' },
  { id: 'shows', label: 'Shows', description: 'Create, edit, and remove shows' },
  { id: 'tiers', label: 'Ticket tiers', description: 'Prices, allocation, and tier setup' },
  { id: 'cms', label: 'Email CMS', description: 'Ticket emails and broadcasts' },
  { id: 'website', label: 'Website content', description: 'Showreel, Studio, Kevin11, and Connect' },
  { id: 'site', label: 'Site settings', description: 'Theme, legal pages, and AI Kev' },
  { id: 'users', label: 'Users & roles', description: 'Invite people and edit what each role can do' },
]

export const STAFF_ROLES = ['super_admin', 'operations', 'custom', 'none'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const ROLE_OPTIONS: { id: StaffRole; label: string; description: string }[] = [
  {
    id: 'super_admin',
    label: 'Super admin',
    description: 'Full control, including users, refunds, and anything that changes the public site.',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Sales lookup, tickets, guest lists, and the door scanner. Cannot edit the site or issue refunds.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Only the privileges you tick. User management stays with super admins.',
  },
  {
    id: 'none',
    label: 'No access',
    description: 'Can sign in to the public site, but not the admin console.',
  },
]

const OPERATIONS_PERMISSIONS: AdminPermission[] = ['sales', 'tickets', 'guestlist', 'scanner']

export type RoleGrant = {
  slug: string
  permissions: readonly string[]
}

export type AdminAccess = {
  role: string
  permissions: AdminPermission[]
  /** Owner or ADMIN_EMAILS — role cannot be changed in the console. */
  locked: boolean
}

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS)

export function isAdminPermission(value: string): value is AdminPermission {
  return PERMISSION_SET.has(value)
}

export function normalizePermissions(values: readonly string[]): AdminPermission[] {
  const picked = new Set<AdminPermission>()
  for (const item of values) {
    if (isAdminPermission(item)) picked.add(item)
  }
  return ADMIN_PERMISSIONS.filter((id) => picked.has(id))
}

export function permissionsForRole(role: StaffRole, custom: readonly string[] = []): AdminPermission[] {
  if (role === 'super_admin') return [...ADMIN_PERMISSIONS]
  if (role === 'operations') return [...OPERATIONS_PERMISSIONS]
  if (role === 'custom') return normalizePermissions(custom)
  return []
}

export function hasPermission(access: Pick<AdminAccess, 'permissions'>, permission: AdminPermission) {
  return access.permissions.includes(permission)
}

export function hasAnyPermission(
  access: Pick<AdminAccess, 'permissions'>,
  permissions: readonly AdminPermission[],
) {
  return permissions.some((permission) => access.permissions.includes(permission))
}

type MetadataShape = { role?: unknown; permissions?: unknown }

export function resolveAccess(
  emails: string[],
  metadata: unknown,
  lockedEmails: readonly string[] = BOOTSTRAP_SUPER_ADMINS,
  roles: readonly RoleGrant[] = [],
): AdminAccess {
  const normalised = emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
  const locked = new Set(lockedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))
  if (normalised.some((email) => locked.has(email))) {
    return { role: 'super_admin', permissions: [...ADMIN_PERMISSIONS], locked: true }
  }

  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as MetadataShape
  const rawRole = typeof meta.role === 'string' ? meta.role.trim() : ''
  const custom = Array.isArray(meta.permissions)
    ? meta.permissions.filter((item): item is string => typeof item === 'string')
    : []

  if (!rawRole || rawRole === 'none') {
    return { role: 'none', permissions: [], locked: false }
  }
  if (rawRole === 'admin' || rawRole === 'super_admin') {
    return { role: 'super_admin', permissions: [...ADMIN_PERMISSIONS], locked: false }
  }

  const match = roles.find((role) => role.slug === rawRole)
  if (match) {
    return { role: match.slug, permissions: normalizePermissions(match.permissions), locked: false }
  }

  // Older accounts stored privileges on the user instead of a saved role.
  if (rawRole === 'custom') {
    return { role: 'custom', permissions: normalizePermissions(custom), locked: false }
  }

  // Built-in operations preset only when the role list could not be loaded.
  if (rawRole === 'operations' && roles.length === 0) {
    return { role: 'operations', permissions: permissionsForRole('operations'), locked: false }
  }

  return { role: rawRole, permissions: [], locked: false }
}

export function metadataForAssignment(role: StaffRole, custom: readonly string[] = []) {
  return {
    role,
    permissions: permissionsForRole(role, custom),
  }
}
