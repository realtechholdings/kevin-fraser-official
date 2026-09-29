'use client'

import { useEffect, useState } from 'react'
import { ASSIGNABLE_PERMISSIONS, ROLE_OPTIONS, type AdminPermission, type StaffRole } from '@/lib/admin/access'

const inputClass = 'admin-input'
const labelClass = 'admin-label'
const btnPrimary = 'admin-btn-primary disabled:opacity-50'
const btnSecondary = 'admin-btn-secondary disabled:opacity-50'
const btnDanger = 'admin-btn-danger disabled:opacity-50'

type StaffUser = {
  id: string
  email: string
  name: string
  imageUrl: string
  lastSignInAt: number | null
  role: StaffRole
  permissions: AdminPermission[]
  locked: boolean
}

type PendingInvite = {
  id: string
  email: string
  createdAt: number
  role: StaffRole
  permissions: AdminPermission[]
}

const INVITE_ROLES = ROLE_OPTIONS.filter((role) => role.id !== 'none')

function roleLabel(role: StaffRole) {
  return ROLE_OPTIONS.find((option) => option.id === role)?.label || role
}

function formatWhen(value: number | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: AdminPermission[]
  onChange: (next: AdminPermission[]) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ASSIGNABLE_PERMISSIONS.map((item) => {
        const checked = selected.includes(item.id)
        return (
          <label
            key={item.id}
            className="flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'var(--admin-border-soft)', background: 'var(--admin-input-bg)' }}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={() => {
                onChange(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])
              }}
            />
            <span>
              <span className="block text-sm font-medium text-white">{item.label}</span>
              <span className="mt-0.5 block text-xs" style={{ color: 'var(--admin-subtle)' }}>
                {item.description}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default function UsersAdminPanel({
  onMessage,
  onError,
}: {
  onMessage: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [invitations, setInvitations] = useState<PendingInvite[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<StaffRole>('operations')
  const [invitePermissions, setInvitePermissions] = useState<AdminPermission[]>([])
  const [inviting, setInviting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<StaffRole>('operations')
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([])
  const [saving, setSaving] = useState(false)

  async function load(search: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setInvitations(data.invitations || [])
      setTotalCount(data.totalCount || 0)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load('')
    // Load once when the Users tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = users.find((user) => user.id === selectedId) || null

  function selectUser(user: StaffUser) {
    setSelectedId(user.id)
    setEditRole(user.role)
    setEditPermissions(user.permissions.filter((id) => id !== 'users'))
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setInviting(true)
    onError('')
    onMessage('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      setInviteEmail('')
      setInviteRole('operations')
      setInvitePermissions([])
      onMessage(
        data.invited
          ? `Invitation sent to ${data.email}.`
          : `${data.user?.email || 'That account'} already exists — role updated.`,
      )
      await load(query)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Invite failed')
    } finally {
      setInviting(false)
    }
  }

  async function saveUser() {
    if (!selected || selected.locked) return
    setSaving(true)
    onError('')
    onMessage('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected.id,
          role: editRole,
          permissions: editPermissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      onMessage(`Updated ${selected.email}. They may need to refresh to see the change.`)
      await load(query)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function revoke(invitationId: string) {
    onError('')
    onMessage('')
    try {
      const res = await fetch(`/api/admin/users?invitationId=${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not revoke invitation')
      onMessage('Invitation revoked.')
      await load(query)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not revoke invitation')
    }
  }

  return (
    <div className="space-y-6">
      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Invite someone</h2>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--admin-muted)' }}>
          Operations can run tickets, sales lookup, guest lists, and the scanner. They cannot change
          tours, prices, the website, emails, or refunds. Super admin is full control. Use Custom
          when you want a shorter list.
        </p>
        <form onSubmit={(event) => void invite(event)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                className={inputClass}
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@email.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                className={inputClass}
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as StaffRole)}
              >
                {INVITE_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
            {ROLE_OPTIONS.find((role) => role.id === inviteRole)?.description}
          </p>
          {inviteRole === 'custom' ? (
            <PermissionPicker selected={invitePermissions} onChange={setInvitePermissions} />
          ) : null}
          <button type="submit" className={btnPrimary} disabled={inviting}>
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {selected ? (
        <section className="admin-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--admin-muted)' }}>
                {selected.email}
              </p>
            </div>
            <button type="button" className={btnSecondary} onClick={() => setSelectedId(null)}>
              Close
            </button>
          </div>
          {selected.locked ? (
            <p className="mt-4 text-sm text-white/70">
              This account is a permanent super admin, including the site owner. Its role cannot be
              changed here.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="max-w-sm">
                <label className={labelClass} htmlFor="edit-role">
                  Role
                </label>
                <select
                  id="edit-role"
                  className={inputClass}
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as StaffRole)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
                {ROLE_OPTIONS.find((role) => role.id === editRole)?.description}
              </p>
              {editRole === 'custom' ? (
                <PermissionPicker selected={editPermissions} onChange={setEditPermissions} />
              ) : null}
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveUser()}>
                {saving ? 'Saving…' : 'Save role'}
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--admin-border-soft)' }}>
          <div>
            <h2 className="text-sm font-semibold text-white">Accounts</h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-subtle)' }}>
              {loading ? 'Loading…' : `${totalCount} signed-up account${totalCount === 1 ? '' : 's'}`}
              {!loading && totalCount > users.length ? ' · showing the latest 100, search to narrow' : ''}
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void load(query)
            }}
          >
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search email or name"
              aria-label="Search users"
            />
            <button type="submit" className={btnSecondary}>
              Search
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Last sign-in</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
                      {user.email}
                    </p>
                  </td>
                  <td className="text-sm text-white/80">{roleLabel(user.role)}</td>
                  <td className="hidden text-sm text-white/60 md:table-cell">{formatWhen(user.lastSignInAt)}</td>
                  <td className="text-right">
                    <button type="button" className="admin-btn-ghost" onClick={() => selectUser(user)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-sm text-white/40">
                    No accounts match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {invitations.length > 0 ? (
        <section className="admin-card overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--admin-border-soft)' }}>
            <h2 className="text-sm font-semibold text-white">Pending invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="hidden md:table-cell">Sent</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.id}>
                    <td className="text-sm text-white">{invite.email}</td>
                    <td className="text-sm text-white/80">{roleLabel(invite.role)}</td>
                    <td className="hidden text-sm text-white/60 md:table-cell">{formatWhen(invite.createdAt)}</td>
                    <td className="text-right">
                      <button type="button" className={btnDanger} onClick={() => void revoke(invite.id)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
