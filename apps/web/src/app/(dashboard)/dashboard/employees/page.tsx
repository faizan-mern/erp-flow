'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import { fetchEmployees, deactivateEmployee, Employee } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<string | undefined>(undefined)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, search, filterActive],
    queryFn: () => fetchEmployees({ page, limit: 20, search: search || undefined, isActive: filterActive }),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <PageTransition>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-semibold text-[#0f172a]">Employees</h2>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {data ? `${data.total} total` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/dashboard/employees/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={14} />
          Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="Search by name or position..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={filterActive ?? ''}
          onChange={(e) => { setFilterActive(e.target.value || undefined); setPage(1) }}
          className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[#0f172a]"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-[13px] text-[#64748b]">Loading...</div>
        )}

        {isError && (
          <div className="p-12 text-center text-[13px] text-red-500">
            Failed to load employees.
          </div>
        )}

        {data && data.employees.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[14px] font-medium text-[#0f172a] mb-1">No employees yet</p>
            <p className="text-[13px] text-[#64748b] mb-4">
              Add your first employee to start tracking attendance and expenses.
            </p>
            <Link
              href="/dashboard/employees/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={14} />
              Add Employee
            </Link>
          </div>
        )}

        {data && data.employees.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-[#e2e8f0]">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-[#64748b]">Name</th>
                <th className="text-left px-5 py-3 font-medium text-[#64748b]">Department</th>
                <th className="text-left px-5 py-3 font-medium text-[#64748b]">Position</th>
                <th className="text-left px-5 py-3 font-medium text-[#64748b]">Status</th>
                <th className="text-left px-5 py-3 font-medium text-[#64748b]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {data.employees.map((emp: Employee) => (
                <tr key={emp.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#0f172a]">
                      {emp.firstName} {emp.lastName}
                    </p>
                    {emp.user?.email && (
                      <p className="text-[11px] text-[#64748b] mt-0.5">{emp.user.email}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#64748b]">{emp.department || '—'}</td>
                  <td className="px-5 py-3.5 text-[#64748b]">{emp.position || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        emp.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-[#64748b]'
                      }`}
                    >
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/employees/${emp.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      {emp.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate ${emp.firstName} ${emp.lastName}?`)) {
                              deactivateMutation.mutate(emp.id)
                            }
                          }}
                          className="text-red-500 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[13px] border border-[#e2e8f0] rounded-lg disabled:opacity-40 hover:bg-slate-50 bg-white"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-[13px] text-[#64748b]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[13px] border border-[#e2e8f0] rounded-lg disabled:opacity-40 hover:bg-slate-50 bg-white"
          >
            Next
          </button>
        </div>
      )}
    </PageTransition>
  )
}
