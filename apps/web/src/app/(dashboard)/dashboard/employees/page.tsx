'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import { fetchEmployees, deactivateEmployee, Employee } from '@/lib/employees'
import { PageTransition } from '@/components/ui/page-transition'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<string | undefined>(undefined)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, debouncedSearch, filterActive],
    queryFn: () => fetchEmployees({ page, limit: 20, search: debouncedSearch || undefined, isActive: filterActive }),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: () => {
      setConfirmId(null)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <PageTransition>
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} total` : ''}
        action={
          <Link
            href="/dashboard/employees/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-3.5 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
          >
            <UserPlus size={14} />
            Add Employee
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name or position..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
          />
        </div>
        <select
          value={filterActive ?? ''}
          onChange={(e) => { setFilterActive(e.target.value || undefined); setPage(1) }}
          className="px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-[13px] text-muted">Loading...</div>
        )}

        {isError && (
          <div className="p-12 text-center text-[13px] text-danger">
            Failed to load employees.
          </div>
        )}

        {data && data.employees.length === 0 && (
          <EmptyState
            title="No employees yet"
            description="Add your first employee to start tracking attendance and expenses."
            action={
              <Link
                href="/dashboard/employees/new"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
              >
                <UserPlus size={14} />
                Add Employee
              </Link>
            }
          />
        )}

        {data && data.employees.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Department</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Position</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {data.employees.map((emp: Employee) => (
                <tr key={emp.id} className="hover:bg-canvas transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-strong">{emp.firstName} {emp.lastName}</p>
                    {emp.user?.email && (
                      <p className="text-[11px] text-muted mt-0.5">{emp.user.email}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted">{emp.department || '—'}</td>
                  <td className="px-5 py-3.5 text-muted">{emp.position || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={emp.isActive ? 'active' : 'inactive'}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/employees/${emp.id}`} className="text-primary hover:underline">
                        Edit
                      </Link>
                      {emp.isActive && (
                        confirmId === emp.id ? (
                          <span className="flex items-center gap-2">
                            <span className="text-[12px] text-muted">Deactivate?</span>
                            <button
                              onClick={() => deactivateMutation.mutate(emp.id)}
                              disabled={deactivateMutation.isPending}
                              className="text-[12px] text-danger font-medium hover:underline disabled:opacity-50"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-[12px] text-muted hover:underline"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(emp.id)}
                            className="text-muted hover:text-danger transition-colors"
                          >
                            Deactivate
                          </button>
                        )
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
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:bg-canvas bg-surface"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-[13px] text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:bg-canvas bg-surface"
          >
            Next
          </button>
        </div>
      )}
    </PageTransition>
  )
}
