'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, X } from 'lucide-react'
import {
  fetchUsers, inviteUser, updateUserRole,
  TeamUser, UserRole, InviteUserData,
} from '@/lib/users'
import { useAuthStore } from '@/store/auth.store'
import { PageTransition } from '@/components/ui/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ROLE_LABEL: Record<UserRole, string> = {
  COMPANY_ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

const EMPTY_INVITE: InviteUserData = {
  email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE',
}

export default function TeamPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState<InviteUserData>(EMPTY_INVITE)
  const [inviteError, setInviteError] = useState('')

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setForm(EMPTY_INVITE)
      setShowInvite(false)
      setInviteError('')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invite failed.'
      setInviteError(message)
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteError('')
    inviteMutation.mutate(form)
  }

  function handleInviteChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <PageTransition>
      <PageHeader
        title="Team"
        subtitle={users.length ? `${users.length} member${users.length === 1 ? '' : 's'}` : ''}
        action={
          !showInvite ? (
            <Button onClick={() => setShowInvite(true)}>
              <UserPlus size={14} />
              Invite User
            </Button>
          ) : undefined
        }
      />

      {/* Invite form (inline, no modal) */}
      {showInvite && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-strong">Invite a teammate</p>
            <button
              onClick={() => { setShowInvite(false); setForm(EMPTY_INVITE); setInviteError('') }}
              className="text-muted hover:text-strong transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name">
                <Input name="firstName" value={form.firstName} onChange={handleInviteChange} required />
              </Field>
              <Field label="Last Name">
                <Input name="lastName" value={form.lastName} onChange={handleInviteChange} required />
              </Field>
            </div>

            <Field label="Email">
              <Input name="email" type="email" value={form.email} onChange={handleInviteChange} required />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Temporary Password" hint="Share this with them out-of-band. They can change it later.">
                <Input name="password" type="text" value={form.password} onChange={handleInviteChange} placeholder="Min 8 characters" required />
              </Field>
              <Field label="Role">
                <select
                  name="role"
                  value={form.role}
                  onChange={handleInviteChange}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </Field>
            </div>

            {inviteError && (
              <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                {inviteError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
              </Button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setForm(EMPTY_INVITE); setInviteError('') }}
                className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Users table */}
      <Card className="overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-[13px] text-muted">Loading...</div>
        )}
        {isError && (
          <div className="p-12 text-center text-[13px] text-danger">Failed to load users.</div>
        )}

        {users.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {users.map((u: TeamUser) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="hover:bg-canvas transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-semibold text-primary">
                            {u.firstName[0]}{u.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-strong">
                            {u.firstName} {u.lastName}
                            {isSelf && <span className="ml-2 text-[11px] text-muted font-normal">(you)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {isSelf ? (
                        <Badge variant="active">{ROLE_LABEL[u.role]}</Badge>
                      ) : (
                        <select
                          value={u.role}
                          disabled={roleMutation.isPending}
                          onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value as UserRole })}
                          className="text-[12px] border border-border rounded-md px-2 py-1 bg-surface text-strong focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="MANAGER">Manager</option>
                          <option value="COMPANY_ADMIN">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </PageTransition>
  )
}
