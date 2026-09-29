import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createRole, listRoles } from '@/lib/admin/roles'
import { normalizePermissions } from '@/lib/admin/access'
import { slugify } from '@/lib/format'

const RESERVED = new Set(['none', 'admin', 'custom', 'super_admin'])

function readRoleBody(body: { name?: unknown; description?: unknown; permissions?: unknown }) {
  const name = String(body.name || '').trim()
  const description = String(body.description || '').trim()
  const raw = Array.isArray(body.permissions)
    ? body.permissions.filter((item): item is string => typeof item === 'string')
    : []
  const permissions = normalizePermissions(raw)
  if (name.length < 2 || name.length > 40) {
    return { ok: false as const, error: 'Role name must be 2–40 characters.' }
  }
  if (permissions.length === 0) {
    return { ok: false as const, error: 'Choose at least one privilege.' }
  }
  return { ok: true as const, name, description, permissions }
}

export async function GET() {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const roles = await listRoles()
    return NextResponse.json({ success: true, roles })
  } catch (error) {
    console.error('Admin roles GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load roles.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const parsed = readRoleBody(await req.json())
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }
    const slug = slugify(parsed.name).slice(0, 40)
    if (!slug || RESERVED.has(slug)) {
      return NextResponse.json(
        { success: false, error: 'Choose a different role name.' },
        { status: 400 },
      )
    }
    const created = await createRole({
      slug,
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions,
    })
    if (!created.ok) {
      return NextResponse.json({ success: false, error: created.error }, { status: 409 })
    }
    return NextResponse.json({ success: true, role: created.role })
  } catch (error) {
    console.error('Admin roles POST:', error)
    return NextResponse.json({ success: false, error: 'Failed to create that role.' }, { status: 500 })
  }
}
