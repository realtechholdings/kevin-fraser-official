import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { accessFromUser, requireAdmin } from '@/lib/admin'
import type { RoleGrant } from '@/lib/admin/access'
import { loadRoleGrants } from '@/lib/admin/roles'

function clerkMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const errors = (error as { errors?: { longMessage?: string; message?: string }[] }).errors
    const first = errors?.[0]
    if (first?.longMessage) return first.longMessage
    if (first?.message) return first.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function appOrigin(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  if (!host) return ''
  const forwarded = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
  const proto = forwarded || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

function readPassword(value: unknown): { password: string } | { error: string } {
  if (typeof value !== 'string' || !value) return { password: '' }
  if (value.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (value.length > 128) return { error: 'Password must be 128 characters or fewer.' }
  return { password: value }
}

async function assignmentFromBody(body: { role?: unknown }) {
  const role = String(body.role || '').trim()
  if (!role) return null
  if (role === 'none') return { role: 'none', permissions: [] as string[] }
  const grants = await loadRoleGrants()
  if (!grants.some((grant) => grant.slug === role)) return null
  return { role, permissions: [] as string[] }
}

function displayName(first: string | null, last: string | null, email: string) {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || email
}

function serializeUser(
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    imageUrl: string
    lastSignInAt: number | null
    emailAddresses: { id: string; emailAddress: string }[]
    primaryEmailAddressId: string | null
    publicMetadata: unknown
  },
  grants: readonly RoleGrant[],
) {
  const emails = user.emailAddresses.map((entry) => entry.emailAddress)
  const primary =
    user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ||
    emails[0] ||
    ''
  const access = accessFromUser(emails, user.publicMetadata, grants)
  return {
    id: user.id,
    email: primary,
    name: displayName(user.firstName, user.lastName, primary),
    imageUrl: user.imageUrl,
    lastSignInAt: user.lastSignInAt,
    role: access.role,
    permissions: access.permissions,
    locked: access.locked,
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const query = (req.nextUrl.searchParams.get('q') || '').trim()

  try {
    const client = await clerkClient()
    const grants = await loadRoleGrants()
    const [users, invitations] = await Promise.all([
      client.users.getUserList({
        limit: 100,
        orderBy: '-created_at',
        ...(query ? { query } : {}),
      }),
      client.invitations.getInvitationList({ status: 'pending', limit: 100, orderBy: '-created_at' }),
    ])

    return NextResponse.json({
      success: true,
      totalCount: users.totalCount,
      users: users.data.map((user) => serializeUser(user, grants)),
      invitations: invitations.data.map((invite) => {
        const access = accessFromUser([invite.emailAddress], invite.publicMetadata, grants)
        return {
          id: invite.id,
          email: invite.emailAddress,
          createdAt: invite.createdAt,
          role: access.role,
          permissions: access.permissions,
        }
      }),
    })
  } catch (error) {
    console.error('Admin users GET:', error)
    return NextResponse.json({ success: false, error: 'Failed to load users.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 })
    }

    const assignment = await assignmentFromBody(body)
    if (!assignment || assignment.role === 'none') {
      return NextResponse.json({ success: false, error: 'Choose a role.' }, { status: 400 })
    }

    const passwordResult = readPassword(body.password)
    if ('error' in passwordResult) {
      return NextResponse.json({ success: false, error: passwordResult.error }, { status: 400 })
    }
    const password = passwordResult.password

    const client = await clerkClient()
    const grants = await loadRoleGrants()
    const existing = await client.users.getUserList({ emailAddress: [email], limit: 1 })
    const found = existing.data[0]
    if (found) {
      const current = accessFromUser(
        found.emailAddresses.map((entry) => entry.emailAddress),
        found.publicMetadata,
        grants,
      )
      if (current.locked) {
        return NextResponse.json(
          { success: false, error: 'That account is a permanent super admin.' },
          { status: 400 },
        )
      }
      if (password) {
        await client.users.updateUser(found.id, { password, signOutOfOtherSessions: true })
      }
      const updated = await client.users.updateUserMetadata(found.id, { publicMetadata: assignment })
      return NextResponse.json({
        success: true,
        user: serializeUser(updated, grants),
        invited: false,
        created: false,
        passwordSet: Boolean(password),
      })
    }

    if (password) {
      const created = await client.users.createUser({
        emailAddress: [email],
        password,
        publicMetadata: assignment,
        skipLegalChecks: true,
      })
      await revokePendingInvites(client, email)
      return NextResponse.json({
        success: true,
        user: serializeUser(created, grants),
        invited: false,
        created: true,
        passwordSet: true,
        email,
      })
    }

    const origin = appOrigin(req)
    const redirectUrl = origin ? `${origin}/sign-up` : undefined

    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: assignment,
      notify: true,
      ignoreExisting: true,
      ...(redirectUrl ? { redirectUrl } : {}),
    })

    return NextResponse.json({ success: true, invited: true, created: false, email })
  } catch (error) {
    console.error('Admin users POST:', error)
    return NextResponse.json(
      { success: false, error: clerkMessage(error, 'Failed to add that user.') },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  try {
    const body = await req.json()
    const userId = String(body.userId || '').trim()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required.' }, { status: 400 })
    }

    const assignment = await assignmentFromBody(body)
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Choose a role.' }, { status: 400 })
    }

    const passwordResult = readPassword(body.password)
    if ('error' in passwordResult) {
      return NextResponse.json({ success: false, error: passwordResult.error }, { status: 400 })
    }

    const client = await clerkClient()
    const grants = await loadRoleGrants()
    const currentUserRecord = await client.users.getUser(userId)
    const current = accessFromUser(
      currentUserRecord.emailAddresses.map((entry) => entry.emailAddress),
      currentUserRecord.publicMetadata,
      grants,
    )
    if (current.locked) {
      return NextResponse.json(
        { success: false, error: 'That account is a permanent super admin.' },
        { status: 400 },
      )
    }

    if (passwordResult.password) {
      await client.users.updateUser(userId, {
        password: passwordResult.password,
        signOutOfOtherSessions: true,
      })
    }
    const updated = await client.users.updateUserMetadata(userId, { publicMetadata: assignment })
    return NextResponse.json({
      success: true,
      user: serializeUser(updated, grants),
      passwordSet: Boolean(passwordResult.password),
    })
  } catch (error) {
    console.error('Admin users PATCH:', error)
    return NextResponse.json(
      { success: false, error: clerkMessage(error, 'Failed to update that user.') },
      { status: 500 },
    )
  }
}

async function revokePendingInvites(
  client: Awaited<ReturnType<typeof clerkClient>>,
  email: string,
) {
  try {
    const pending = await client.invitations.getInvitationList({
      status: 'pending',
      query: email,
      limit: 20,
    })
    await Promise.all(
      pending.data
        .filter((invite) => invite.emailAddress.toLowerCase() === email)
        .map((invite) => client.invitations.revokeInvitation(invite.id)),
    )
  } catch (error) {
    console.error('Admin users revoke pending invites:', error)
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin('users')
  if (!admin.ok) {
    return NextResponse.json({ success: false, error: admin.error }, { status: admin.status })
  }

  const invitationId = (req.nextUrl.searchParams.get('invitationId') || '').trim()
  if (!invitationId) {
    return NextResponse.json({ success: false, error: 'invitationId is required.' }, { status: 400 })
  }

  try {
    const client = await clerkClient()
    await client.invitations.revokeInvitation(invitationId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin users DELETE:', error)
    return NextResponse.json({ success: false, error: 'Failed to revoke that invitation.' }, { status: 500 })
  }
}
