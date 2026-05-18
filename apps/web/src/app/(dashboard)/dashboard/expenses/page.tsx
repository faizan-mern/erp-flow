'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, Plus, BarChart2, CheckCircle, XCircle } from 'lucide-react'
import {
  fetchExpenses, fetchCategories,
  approveExpense, rejectExpense,
  Expense, ExpenseStatus, ExpenseCategory,
} from '@/lib/expenses'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { formatMoney, formatDate } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'

type StatusFilter = ExpenseStatus | 'ALL'

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All',      value: 'ALL'      },
  { label: 'Pending',  value: 'PENDING'  },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

const STATUS_BADGE: Record<ExpenseStatus, 'pending' | 'approved' | 'rejected'> = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canApprove = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER'
  const isEmployee = user?.role === 'EMPLOYEE'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Debounce search input — 300ms pause before firing the query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expenses', page, debouncedSearch, statusFilter],
    queryFn: () => fetchExpenses({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
  })

  // Fetch categories once to display category color dots next to titles
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchCategories,
  })
  const catMap = Object.fromEntries(
    (categories as ExpenseCategory[]).map((c) => [c.id, c])
  )

  const approveMutation = useMutation({
    mutationFn: approveExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense approved')
    },
    onError: () => toast.error('Failed to approve expense'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setRejectId(null)
      setRejectReason('')
      toast.success('Expense rejected')
    },
    onError: () => toast.error('Failed to reject expense'),
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <PageTransition>
      <PageHeader
        title={isEmployee ? 'My Expenses' : 'Expenses'}
        subtitle={data ? `${data.total} total` : ''}
        action={
          <div className="flex items-center gap-2">
            {/* Analytics is restricted to COMPANY_ADMIN + MANAGER on the backend,
                so hide the link entirely for EMPLOYEE to avoid showing a button
                that always 403s. `canApprove` is already the admin/manager guard. */}
            {canApprove && (
              <Link
                href="/dashboard/expenses/analytics"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-border bg-surface hover:bg-canvas transition-colors text-muted"
              >
                <BarChart2 size={14} />
                Analytics
              </Link>
            )}
            <Link
              href="/dashboard/expenses/new"
              className="inline-flex items-center gap-2 bg-primary text-white px-3.5 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
            >
              <Plus size={14} />
              Submit Expense
            </Link>
          </div>
        }
      />

      {/* Status filter tabs + search row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg shrink-0">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1) }}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <TableSkeleton
            headers={[
              'Title',
              ...(!isEmployee ? ['Employee'] : []),
              'Amount',
              'Date',
              'Status',
              'Actions',
            ]}
          />
        )}
        {!isLoading && isError && (
          <div className="p-12 text-center text-[13px] text-danger">
            Failed to load expenses.
          </div>
        )}

        {data && data.expenses.length === 0 && (
          <EmptyState
            title="No expenses found"
            description={
              statusFilter === 'ALL'
                ? 'Submit your first expense to get started.'
                : `No ${statusFilter.toLowerCase()} expenses.`
            }
            action={
              <Link
                href="/dashboard/expenses/new"
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
              >
                <Plus size={14} />
                Submit Expense
              </Link>
            }
          />
        )}

        {data && data.expenses.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Title</th>
                {/* Hide "Employee" column for employees — they only see their own */}
                {!isEmployee && (
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Employee</th>
                )}
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {data.expenses.map((exp: Expense) => {
                const cat = exp.categoryId ? catMap[exp.categoryId] : null
                return (
                  <tr key={exp.id} className="hover:bg-canvas transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {cat && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: cat.color }}
                          />
                        )}
                        <span className="font-medium text-strong">{exp.title}</span>
                      </div>
                      {cat && (
                        <p className="text-[11px] text-muted mt-0.5 ml-4">{cat.name}</p>
                      )}
                    </td>
                    {!isEmployee && (
                      <td className="px-5 py-3.5 text-muted">
                        {exp.employee.firstName} {exp.employee.lastName}
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-medium text-strong">
                      {formatMoney(exp.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{formatDate(exp.expenseDate)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_BADGE[exp.status]}>{exp.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/expenses/${exp.id}`}
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>

                        {/* Inline approval queue for managers — only on PENDING rows
                            that the current user did NOT submit (segregation of duties).
                            Backend enforces this too; hiding the buttons here just keeps
                            managers from clicking something that always 403s. */}
                        {canApprove && exp.status === 'PENDING' && exp.employeeId !== user?.employeeId && (
                          rejectId === exp.id ? (
                            // Expanded reject state: shows reason input inline
                            <span className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason (optional)"
                                className="px-2 py-1 border border-border rounded text-[12px] w-36 focus:outline-none focus:ring-1 focus:ring-danger/40 bg-surface"
                              />
                              <button
                                onClick={() =>
                                  rejectMutation.mutate({
                                    id: exp.id,
                                    reason: rejectReason || undefined,
                                  })
                                }
                                disabled={rejectMutation.isPending}
                                className="text-[12px] text-danger font-medium hover:underline disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setRejectId(null); setRejectReason('') }}
                                className="text-[12px] text-muted hover:underline"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            // Default state: show approve + reject buttons
                            <span className="flex items-center gap-2">
                              <button
                                onClick={() => approveMutation.mutate(exp.id)}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-1 text-[12px] text-success font-medium hover:underline disabled:opacity-50"
                              >
                                <CheckCircle size={12} />
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectId(exp.id)}
                                className="flex items-center gap-1 text-[12px] text-danger hover:underline"
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            </span>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
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
