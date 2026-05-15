'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { fetchEmployee, updateEmployee, CreateEmployeeData } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [overrides, setOverrides] = useState<Partial<CreateEmployeeData>>({})
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
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

  const mutation = useMutation({
    mutationFn: (data: Partial<CreateEmployeeData>) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save changes.'
      setError(message)
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setOverrides((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    mutation.mutate({
      ...form,
      salary: form.salary ? Number(form.salary) : undefined,
      department: form.department || undefined,
      position:   form.position   || undefined,
      phone:      form.phone      || undefined,
      address:    form.address    || undefined,
      hireDate:   form.hireDate
        ? new Date(form.hireDate as string).toISOString()
        : undefined,
    })
  }

  if (isLoading) {
    return <div className="p-10 text-center text-[13px] text-muted">Loading employee...</div>
  }

  if (!employee) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px] font-medium text-strong mb-2">Employee not found</p>
        <Link href="/dashboard/employees" className="text-primary text-[13px] hover:underline">
          Back to employees
        </Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div>
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link
            href="/dashboard/employees"
            className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors"
          >
            <ArrowLeft size={13} />
            Employees
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">
            {employee.firstName} {employee.lastName}
          </span>
        </div>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            <Card className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-primary">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-strong">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-[12px] text-muted mt-0.5">
                    {[employee.position, employee.department].filter(Boolean).join(' · ') || 'No details added yet'}
                  </p>
                </div>
              </div>
              <Badge variant={employee.isActive ? 'active' : 'inactive'}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </Card>

            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Personal</p>
                  <div className="grid grid-cols-2 gap-4 max-w-xl">
                    <Field label="First Name">
                      <Input name="firstName" value={form.firstName} onChange={handleChange} required />
                    </Field>
                    <Field label="Last Name">
                      <Input name="lastName" value={form.lastName} onChange={handleChange} required />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-divider" />

                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Employment</p>
                  <div className="grid grid-cols-2 gap-4 max-w-xl mb-4">
                    <Field label="Department">
                      <Input name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
                    </Field>
                    <Field label="Position">
                      <Input name="position" value={form.position} onChange={handleChange} placeholder="e.g. Engineer" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-xl">
                    <Field label="Hire Date">
                      <Input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
                    </Field>
                    <Field label="Salary (USD)">
                      <Input name="salary" type="number" value={form.salary ?? ''} onChange={handleChange} placeholder="e.g. 60000" />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-divider" />

                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Contact</p>
                  <div className="grid grid-cols-2 gap-4 max-w-xl">
                    <Field label="Phone">
                      <Input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" />
                    </Field>
                    <Field label="Address">
                      <Input name="address" value={form.address} onChange={handleChange} placeholder="123 Main St, City" />
                    </Field>
                  </div>
                </div>

                {error && (
                  <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {saved && (
                  <p className="text-[13px] text-success bg-success-soft border border-success/20 rounded-lg px-3 py-2">
                    Changes saved.
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save changes'}
                  </Button>
                  <Link
                    href="/dashboard/employees"
                    className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </Card>
          </div>

          <div className="w-72 shrink-0">
            <Card className="p-5">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Employee Info</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-muted mb-1">Status</p>
                  <Badge variant={employee.isActive ? 'active' : 'inactive'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted mb-1">Employee ID</p>
                  <p className="text-[12px] font-mono text-strong">{employee.id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="border-t border-divider mt-4 pt-4">
                <p className="text-[12px] text-muted leading-relaxed">
                  Changes are applied to the employee record immediately after saving.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
