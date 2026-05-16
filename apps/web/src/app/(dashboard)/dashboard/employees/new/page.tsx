'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createEmployee, CreateEmployeeData } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

const EMPTY_FORM: CreateEmployeeData = {
  firstName: '',
  lastName: '',
  department: '',
  position: '',
  phone: '',
  address: '',
  hireDate: '',
  salary: undefined,
}

export default function NewEmployeePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateEmployeeData>(EMPTY_FORM)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      router.push('/dashboard/employees')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create employee.'
      setError(message)
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    mutation.mutate({
      ...form,
      salary: form.salary ? Number(form.salary) : undefined,
      department: form.department || undefined,
      position: form.position || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : undefined,
    })
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
          <span className="text-strong font-medium">Add Employee</span>
        </div>

        <PageHeader
          title="Add Employee"
          subtitle="Fill in the details below to add a new employee to your team."
        />

        <div className="flex gap-6 items-start">
          <Card className="flex-1 min-w-0 p-6">
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
                    <Input name="position" value={form.position} onChange={handleChange} placeholder="e.g. Software Engineer" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                  <Field label="Hire Date">
                    <Input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
                  </Field>
                  <Field label="Salary (PKR)">
                    <Input name="salary" type="number" value={form.salary ?? ''} onChange={handleChange} placeholder="e.g. 150000" />
                  </Field>
                </div>
              </div>

              <div className="border-t border-divider" />

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Contact</p>
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                  <Field label="Phone">
                    <Input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000" />
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

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Add Employee'}
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

          <div className="w-72 shrink-0">
            <Card className="p-5">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Required fields</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-strong">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  First name
                </div>
                <div className="flex items-center gap-2 text-[13px] text-strong">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Last name
                </div>
              </div>
              <div className="border-t border-divider mt-4 pt-4">
                <p className="text-[12px] text-muted leading-relaxed">
                  All other fields are optional and can be filled in later from the employee profile.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
