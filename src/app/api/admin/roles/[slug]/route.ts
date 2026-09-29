import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { deleteRole, updateRole } from '@/lib/admin/roles'
import { normalizePermissions } from '@/lib/admin/access'

type Ctx = { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { slug } = await ctx.params
    const body = (await req.json()) as { name?: unknown; description?: unknown; permissions?: unknown }
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim()
    const raw = Array.isArray(body.permissions)
      ? body.permissions.filter((item): item is string => typeof item === 'string')
      : []
    const permissions = normalizePermissions(raw)
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { success: false, error: 'Role name must be 2–40 characters.' },
        { status: 400 },
      )
    }
    if (slug !== 'super_admin' && permissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Choose at least one privilege.' },
        { status: 400 },
      )
    }

    const updated = await updateRole(decodeURIComponent(slug), { name, description, permissions })
    if (!updated.ok) {
      return NextResponse.json({ success: false, error: updated.error }, { status: 404 })
    }
    return NextResponse.json({ success: true, role: updated.role })
  } catch (error) {
    console.error('Admin roles PATCH:', error)
    return NextResponse.json({ success: false, error: 'Failed to update that role.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const { slug } = await ctx.params
    const removed = await deleteRole(decodeURIComponent(slug))
    if (!removed.ok) {
      const status = removed.error.includes('cannot be deleted') ? 400 : 404
      return NextResponse.json({ success: false, error: removed.error }, { status })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin roles DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete that role.' }, { status: 500 })
  }
}
