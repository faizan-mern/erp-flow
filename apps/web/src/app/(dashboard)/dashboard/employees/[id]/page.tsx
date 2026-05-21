'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import {
  fetchEmployee, updateEmployee, fetchAttendance,
  CreateEmployeeData, AttendanceRecord,
} from '@/lib/employees'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { formatTime12h } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Tab = 'details' | 'attendance'

const ATTENDANCE_STATUS_VARIANT: Record<string, 'active' | 'inactive' | 'pending'> = {
  PRESENT: 'active',
  ABSENT: 'inactive',
  LATE: 'pending',
  HALF_DAY: 'pending',
  ON_LEAVE: 'inactive',
}

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const canEdit = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER'
  // Only admins can promote an employee to a login user (mirrors Team page invite gate).
  const canInvite = user?.role === 'COMPANY_ADMIN'

  const [tab, setTab] = useState<Tab>('details')
  const [overrides, setOverrides] = useState<Partial<CreateEmployeeData>>({})
  const [error, setError] = useState('')

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
  })

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => fetchAttendance(id),
    enabled: tab === 'attendance',
  })

  const form = {
    firstName:  overrides.firstName  ?? employee?.firstName  ?? '',
    lastName:   overrides.lastName   ?? employee?.lastName   ?? '',
    department: overrides.department ?? employee?.department ?? '',
    position:   overrides.position   ?? employee?.position   ?? '',
    phone:      overrides.phone      ?? employee?.phone      ?? '',
    address:    overrides.address    ?? employee?.address    ?? '',
    salary:     overrides.salary     ?? employee?.salary     ?? '',
    hireDate:   overrides.hireDate   ?? (employee?.hireDate
      ? new Date(employee.hireDate).toISOString().split('T')[0]
      : ''),
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeData>) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setOverrides({})
      toast.success('Employee updated')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save changes.'
      setError(message)
    },
  })


  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setOverrides((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    updateMutation.mutate({
      ...form,
      salary: form.salary ? Number(form.salary) : undefined,
      department: form.department || undefined,
      position:   form.position   || undefined,
      phone:      form.phone      || undefined,
      address:    form.address    || undefined,
      hireDate:   form.hireDate ? new Date(form.hireDate as string).toISOString() : undefined,
    })
  }

  if (isLoading) {
    return <div className="p-10 text-center text-[13px] text-muted">Loading employee...</div>
  }

  if (!employee) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px] font-medium text-strong mb-2">Employee not found</p>
        <Link href="/dashboard/employees" className="text-primary text-[13px] hover:underline">Back to employees</Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link href="/dashboard/employees" className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors">
            <ArrowLeft size={13} />
            Employees
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">{employee.firstName} {employee.lastName}</span>
        </div>

        {/* Profile card */}
        <Card className="px-5 py-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-primary">
                {employee.firstName[0]}{employee.lastName[0]}
              </span>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-strong">{employee.firstName} {employee.lastName}</p>
              <p className="text-[12px] text-muted mt-0.5">
                {[employee.position, employee.department].filter(Boolean).join(' · ') || 'No details added yet'}
              </p>
            </div>
          </div>
          <Badge variant={employee.isActive ? 'active' : 'inactive'}>
            {employee.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border">
          {([
            { id: 'details' as Tab, label: 'Details' },
            { id: 'attendance' as Tab, label: 'Attendance History' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              <Card className="p-6">
                {canEdit ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Personal</p>
                      <div className="grid grid-cols-2 gap-4 max-w-xl">
                        <Field label="First Name"><Input name="firstName" value={form.firstName} onChange={handleChange} required /></Field>
                        <Field label="Last Name"><Input name="lastName" value={form.lastName} onChange={handleChange} required /></Field>
                      </div>
                    </div>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Employment</p>
                      <div className="grid grid-cols-2 gap-4 max-w-xl mb-4">
                        <Field label="Department"><Input name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" /></Field>
                        <Field label="Position"><Input name="position" value={form.position} onChange={handleChange} placeholder="e.g. Engineer" /></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4 max-w-xl">
                        <Field label="Hire Date"><Input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} /></Field>
                        <Field label="Salary (PKR)"><Input name="salary" type="number" value={form.salary ?? ''} onChange={handleChange} placeholder="e.g. 150000" /></Field>
                      </div>
                    </div>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Contact</p>
                      <div className="grid grid-cols-2 gap-4 max-w-xl">
                        <Field label="Phone"><Input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000" /></Field>
                        <Field label="Address"><Input name="address" value={form.address} onChange={handleChange} placeholder="123 Main St, City" /></Field>
                      </div>
                    </div>

                    {error && <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex gap-3 pt-1">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                      </Button>
                      <Link href="/dashboard/employees" className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors">
                        Cancel
                      </Link>
                    </div>
                  </form>
                ) : (
                  <p className="text-[13px] text-muted">You do not have permission to edit employee records.</p>
                )}
              </Card>
            </div>

            <div className="w-72 shrink-0">
              <Card className="p-5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-4">Account</p>

                {employee.user?.email ? (
                  // Linked login user — show email + role badge.
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-muted mb-1">Login Email</p>
                      <p className="text-[12px] text-strong truncate" title={employee.user.email}>
                        {employee.user.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-1">Role</p>
                      <Badge variant="active">
                        {employee.user.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  // No linked user — the actionable state. Bridges Employee ↔ Team module.
                  <div>
                    <p className="text-[12px] text-muted leading-relaxed mb-3">
                      This employee doesn&apos;t have a login account yet.
                    </p>
                    {canInvite && employee.isActive && (
                      <Link
                        href={`/dashboard/team?invite=1&firstName=${encodeURIComponent(employee.firstName)}&lastName=${encodeURIComponent(employee.lastName)}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-primary border border-primary/30 hover:bg-primary-soft transition-colors"
                      >
                        <UserPlus size={13} />
                        Invite as user
                      </Link>
                    )}
                  </div>
                )}

                {employee.hireDate && (
                  <>
                    <div className="border-t border-divider mt-4 pt-4">
                      <p className="text-[11px] text-muted mb-1">Hired</p>
                      <p className="text-[12px] text-strong">
                        {new Date(employee.hireDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Attendance tab — read-only history */}
        {tab === 'attendance' && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Attendance History</p>
              </div>

              {loadingAttendance && (
                <div className="p-8 text-center text-[13px] text-muted">Loading...</div>
              )}

              {!loadingAttendance && attendance.length === 0 && (
                <div className="p-8 text-center text-[13px] text-muted">No attendance records yet.</div>
              )}

              {!loadingAttendance && attendance.length > 0 && (
                <table className="w-full text-[13px]">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Check In</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {attendance.map((record: AttendanceRecord) => (
                      <tr key={record.id} className="hover:bg-canvas">
                        <td className="px-5 py-3 text-strong">
                          {new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={ATTENDANCE_STATUS_VARIANT[record.status] ?? 'inactive'}>
                            {record.status.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {record.checkIn ? formatTime12h(record.checkIn) : <span className="text-muted/50 italic">Not checked in</span>}
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {record.checkOut ? formatTime12h(record.checkOut) : <span className="text-muted/50 italic">Not checked out</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
