'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchEmployee, updateEmployee, CreateEmployeeData } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Partial<CreateEmployeeData>>({})
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
  })

  // Pre-fill form once employee data loads
  useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department ?? '',
        position: employee.position ?? '',
        phone: employee.phone ?? '',
        address: employee.address ?? '',
        salary: employee.salary ?? undefined,
        hireDate: employee.hireDate
          ? new Date(employee.hireDate).toISOString().split('T')[0]
          : '',
      })
    }
  }, [employee])

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
      hireDate: form.hireDate
        ? new Date(form.hireDate as string).toISOString()
        : undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center text-[13px] text-[#64748b]">Loading employee...</div>
    )
  }

  if (!employee) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px] font-medium text-[#0f172a] mb-2">Employee not found</p>
        <Link href="/dashboard/employees" className="text-blue-600 text-[13px] hover:underline">
          Back to employees
        </Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="max-w-xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link href="/dashboard/employees" className="text-[#64748b] hover:text-[#0f172a]">
            Employees
          </Link>
          <span className="text-[#e2e8f0]">/</span>
          <span className="text-[#0f172a] font-medium">
            {employee.firstName} {employee.lastName}
          </span>
        </div>

        {/* Profile header */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] px-5 py-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[#0f172a]">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-[12px] text-[#64748b] mt-0.5">
              {employee.position || 'No position set'}{employee.department ? ` · ${employee.department}` : ''}
            </p>
          </div>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              employee.isActive
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-100 text-[#64748b]'
            }`}
          >
            {employee.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <p className="text-[13px] font-medium text-[#0f172a] mb-4">Edit details</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  First Name
                </label>
                <input
                  name="firstName"
                  value={form.firstName ?? ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  Last Name
                </label>
                <input
                  name="lastName"
                  value={form.lastName ?? ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  Department
                </label>
                <input
                  name="department"
                  value={form.department ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. Engineering"
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  Position
                </label>
                <input
                  name="position"
                  value={form.position ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. Engineer"
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  Hire Date
                </label>
                <input
                  name="hireDate"
                  type="date"
                  value={form.hireDate as string ?? ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#64748b] mb-1">
                  Salary (USD)
                </label>
                <input
                  name="salary"
                  type="number"
                  value={form.salary ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. 60000"
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#64748b] mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone ?? ''}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#64748b] mb-1">Address</label>
              <input
                name="address"
                value={form.address ?? ''}
                onChange={handleChange}
                placeholder="123 Main St, City"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {saved && (
              <p className="text-[13px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Changes saved.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
              <Link
                href="/dashboard/employees"
                className="px-5 py-2 rounded-lg text-[13px] font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  )
}
