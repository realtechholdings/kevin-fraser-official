import dbConnect from '@/lib/db'
import AdminRole from '@/lib/models/AdminRole'
import {
  ADMIN_PERMISSIONS,
  normalizePermissions,
  type AdminPermission,
  type RoleGrant,
} from '@/lib/admin/access'

const OPERATIONS_PERMISSIONS: AdminPermission[] = ['sales', 'tickets', 'guestlist', 'scanner']

export type StoredRole = {
  slug: string
  name: string
  description: string
  permissions: AdminPermission[]
  system: boolean
}

let cache: { at: number; roles: StoredRole[] } | null = null

export function invalidateRoleCache() {
  cache = null
}

function serialize(doc: {
  slug: string
  name: string
  description?: string
  permissions?: string[]
  system?: boolean
}): StoredRole {
  const system = Boolean(doc.system) || doc.slug === 'super_admin'
  return {
    slug: doc.slug,
    name: doc.name,
    description: doc.description || '',
    permissions: system ? [...ADMIN_PERMISSIONS] : normalizePermissions(doc.permissions || []),
    system,
  }
}

export async function ensureDefaultRoles() {
  await dbConnect()
  await AdminRole.updateOne(
    { slug: 'super_admin' },
    {
      $set: { permissions: [...ADMIN_PERMISSIONS], system: true },
      $setOnInsert: {
        slug: 'super_admin',
        name: 'Super admin',
        description: 'Full control, including users, refunds, and anything that changes the public site.',
      },
    },
    { upsert: true },
  )
  await AdminRole.updateOne(
    { slug: 'operations' },
    {
      $setOnInsert: {
        slug: 'operations',
        name: 'Operations',
        description: 'Sales lookup, tickets, guest lists, and the door scanner.',
        permissions: OPERATIONS_PERMISSIONS,
        system: false,
      },
    },
    { upsert: true },
  )
}

export async function listRoles(): Promise<StoredRole[]> {
  if (cache && Date.now() - cache.at < 10_000) return cache.roles
  await ensureDefaultRoles()
  const docs = await AdminRole.find().sort({ system: -1, name: 1 })
  const roles = docs.map(serialize)
  cache = { at: Date.now(), roles }
  return roles
}

export async function loadRoleGrants(): Promise<RoleGrant[]> {
  const roles = await listRoles()
  return roles.map((role) => ({ slug: role.slug, permissions: role.permissions }))
}

export async function getRole(slug: string) {
  const roles = await listRoles()
  return roles.find((role) => role.slug === slug) || null
}

export async function createRole(input: {
  slug: string
  name: string
  description: string
  permissions: AdminPermission[]
}) {
  await ensureDefaultRoles()
  const existing = await AdminRole.findOne({ slug: input.slug })
  if (existing) return { ok: false as const, error: 'A role with that name already exists.' }
  const doc = await AdminRole.create({
    slug: input.slug,
    name: input.name,
    description: input.description,
    permissions: input.permissions,
    system: false,
  })
  invalidateRoleCache()
  return { ok: true as const, role: serialize(doc) }
}

export async function updateRole(
  slug: string,
  input: { name: string; description: string; permissions: AdminPermission[] },
) {
  await ensureDefaultRoles()
  const doc = await AdminRole.findOne({ slug })
  if (!doc) return { ok: false as const, error: 'Role not found.' }
  doc.name = input.name
  doc.description = input.description
  if (!doc.system && slug !== 'super_admin') {
    doc.permissions = input.permissions
  }
  await doc.save()
  invalidateRoleCache()
  return { ok: true as const, role: serialize(doc) }
}

export async function deleteRole(slug: string) {
  await ensureDefaultRoles()
  const doc = await AdminRole.findOne({ slug })
  if (!doc) return { ok: false as const, error: 'Role not found.' }
  if (doc.system || slug === 'super_admin') {
    return { ok: false as const, error: 'Super admin cannot be deleted.' }
  }
  await doc.deleteOne()
  invalidateRoleCache()
  return { ok: true as const }
}
