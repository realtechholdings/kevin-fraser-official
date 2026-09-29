'use client'

import { useEffect, useState } from 'react'
import { ASSIGNABLE_PERMISSIONS, type AdminPermission } from '@/lib/admin/access'

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
  role: string
  permissions: AdminPermission[]
  locked: boolean
}

type PendingInvite = {
  id: string
  email: string
  createdAt: number
  role: string
  permissions: AdminPermission[]
}

type RoleRecord = {
  slug: string
  name: string
  description: string
  permissions: AdminPermission[]
  system: boolean
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

function privilegeLabel(id: AdminPermission) {
  return ASSIGNABLE_PERMISSIONS.find((item) => item.id === id)?.label || id
}

function PermissionPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: AdminPermission[]
  onChange: (next: AdminPermission[]) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ASSIGNABLE_PERMISSIONS.map((item) => {
        const checked = selected.includes(item.id)
        return (
          <label
            key={item.id}
            className="flex gap-3 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: 'var(--admin-border-soft)',
              background: 'var(--admin-input-bg)',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.7 : 1,
            }}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              disabled={disabled}
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
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('operations')
  const [inviting, setInviting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('none')
  const [saving, setSaving] = useState(false)
  const [roleEditor, setRoleEditor] = useState<'new' | string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [rolePermissions, setRolePermissions] = useState<AdminPermission[]>([])
  const [roleBusy, setRoleBusy] = useState(false)

  const editingRole = roles.find((role) => role.slug === roleEditor) || null

  function roleNameOf(slug: string) {
    if (!slug || slug === 'none') return 'No access'
    return roles.find((role) => role.slug === slug)?.name || slug
  }

  async function load(search: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/users?${params.toString()}`),
        fetch('/api/admin/roles'),
      ])
      const usersData = await usersRes.json()
      const rolesData = await rolesRes.json()
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to load users')
      if (!rolesRes.ok) throw new Error(rolesData.error || 'Failed to load roles')
      const nextRoles = (rolesData.roles || []) as RoleRecord[]
      setUsers(usersData.users || [])
      setInvitations(usersData.invitations || [])
      setTotalCount(usersData.totalCount || 0)
      setRoles(nextRoles)
      setInviteRole((current) =>
        nextRoles.some((role) => role.slug === current) ? current : nextRoles[0]?.slug || 'operations',
      )
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
  }

  function openNewRole() {
    setRoleEditor('new')
    setRoleName('')
    setRoleDescription('')
    setRolePermissions([])
  }

  function openRole(role: RoleRecord) {
    setRoleEditor(role.slug)
    setRoleName(role.name)
    setRoleDescription(role.description)
    setRolePermissions(role.permissions)
  }

  async function saveRole(event: React.FormEvent) {
    event.preventDefault()
    if (!roleEditor) return
    setRoleBusy(true)
    onError('')
    onMessage('')
    try {
      const creating = roleEditor === 'new'
      const res = await fetch(creating ? '/api/admin/roles' : `/api/admin/roles/${encodeURIComponent(roleEditor)}`, {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          permissions: rolePermissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save that role')
      onMessage(creating ? `Created ${data.role?.name || 'role'}.` : `Updated ${data.role?.name || 'role'}.`)
      setRoleEditor(null)
      await load(query)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save that role')
    } finally {
      setRoleBusy(false)
    }
  }

  async function removeRole(role: RoleRecord) {
    if (role.system) return
    if (!window.confirm(`Delete the ${role.name} role? People assigned to it will lose admin access until you give them another role.`)) {
      return
    }
    setRoleBusy(true)
    onError('')
    onMessage('')
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(role.slug)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not delete that role')
      onMessage(`Deleted ${role.name}.`)
      setRoleEditor(null)
      await load(query)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete that role')
    } finally {
      setRoleBusy(false)
    }
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
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      setInviteEmail('')
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
        body: JSON.stringify({ userId: selected.id, role: editRole }),
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

  const inviteDescription = roles.find((role) => role.slug === inviteRole)?.description
  const assignedDescription = roles.find((role) => role.slug === editRole)?.description

  return (
    <div className="space-y-6">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Roles</h2>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--admin-muted)' }}>
              Privileges belong to the role. Change a role and everyone assigned to it picks up the
              new access. Super admin always has everything and cannot be deleted.
            </p>
          </div>
          <button type="button" className={btnPrimary} onClick={openNewRole}>
            New role
          </button>
        </div>

        <div className="mt-5 divide-y divide-white/10">
          {roles.map((role) => (
            <div key={role.slug} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
              <div>
                <p className="text-sm font-medium text-white">
                  {role.name}
                  {role.system ? (
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--admin-subtle)' }}>
                      Built-in
                    </span>
                  ) : null}
                </p>
                {role.description ? (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-subtle)' }}>
                    {role.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-white/60">
                  {role.permissions.map(privilegeLabel).join(' · ')}
                </p>
              </div>
              <button type="button" className="admin-btn-ghost" onClick={() => openRole(role)}>
                Edit
              </button>
            </div>
          ))}
          {!loading && roles.length === 0 ? (
            <p className="text-sm text-white/40">No roles yet.</p>
          ) : null}
        </div>

        {roleEditor ? (
          <form onSubmit={(event) => void saveRole(event)} className="mt-5 space-y-4 border-t pt-5" style={{ borderColor: 'var(--admin-border-soft)' }}>
            <h3 className="text-sm font-semibold text-white">
              {roleEditor === 'new' ? 'New role' : `Edit ${editingRole?.name || 'role'}`}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="role-name">
                  Name
                </label>
                <input
                  id="role-name"
                  className={inputClass}
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  required
                  maxLength={40}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="role-description">
                  Description
                </label>
                <input
                  id="role-description"
                  className={inputClass}
                  value={roleDescription}
                  onChange={(event) => setRoleDescription(event.target.value)}
                  placeholder="What this role is for"
                />
              </div>
            </div>
            {editingRole?.system ? (
              <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
                Super admin keeps every privilege. You can still rename it.
              </p>
            ) : null}
            <PermissionPicker
              selected={editingRole?.system ? editingRole.permissions : rolePermissions}
              onChange={setRolePermissions}
              disabled={Boolean(editingRole?.system)}
            />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnPrimary} disabled={roleBusy}>
                {roleBusy ? 'Saving…' : 'Save role'}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setRoleEditor(null)}>
                Cancel
              </button>
              {editingRole && !editingRole.system ? (
                <button
                  type="button"
                  className={btnDanger}
                  disabled={roleBusy}
                  onClick={() => void removeRole(editingRole)}
                >
                  Delete role
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Invite someone</h2>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--admin-muted)' }}>
          They receive a sign-in invite and only see the parts of admin their role allows.
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
                onChange={(event) => setInviteRole(event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.slug} value={role.slug}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {inviteDescription ? (
            <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
              {inviteDescription}
            </p>
          ) : null}
          <button type="submit" className={btnPrimary} disabled={inviting || roles.length === 0}>
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
                  onChange={(event) => setEditRole(event.target.value)}
                >
                  <option value="none">No access</option>
                  {roles.map((role) => (
                    <option key={role.slug} value={role.slug}>
                      {role.name}
                    </option>
                  ))}
                  {editRole !== 'none' && !roles.some((role) => role.slug === editRole) ? (
                    <option value={editRole}>{editRole}</option>
                  ) : null}
                </select>
              </div>
              {assignedDescription ? (
                <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
                  {assignedDescription}
                </p>
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
                  <td className="text-sm text-white/80">{roleNameOf(user.role)}</td>
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
                    <td className="text-sm text-white/80">{roleNameOf(invite.role)}</td>
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
