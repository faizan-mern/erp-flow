'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { fetchExpense, approveExpense, rejectExpense } from '@/lib/expenses'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { formatMoney, formatDate } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'

const STATUS_BADGE: Record<string, 'pending' | 'approved' | 'rejected'> = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canApprove = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER'

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: expense, isLoading, isError } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => fetchExpense(id),
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => approveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense approved')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to approve expense.'
      toast.error(message)
    },
  })

  // Takes reason as a parameter rather than closing over state — avoids stale closure
  const rejectMutation = useMutation({
    mutationFn: (reason?: string) => rejectExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setRejectOpen(false)
      setRejectReason('')
      toast.success('Expense rejected')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reject expense.'
      toast.error(message)
    },
  })

  return (
    <PageTransition>
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors"
          >
            <ArrowLeft size={13} />
            Expenses
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">{expense?.title ?? 'Expense'}</span>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-[13px] text-muted">Loading...</div>
        )}
        {isError && (
          <div className="p-12 text-center text-[13px] text-danger">Failed to load expense.</div>
        )}

        {expense && (
          <>
            <PageHeader
              title={expense.title}
              subtitle={`Submitted by ${expense.employee.firstName} ${expense.employee.lastName}`}
            />

            <div className="flex gap-6 items-start">
              {/* Main detail card */}
              <Card className="flex-1 min-w-0 p-6 space-y-5">

                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Details</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Amount</p>
                      <p className="text-[18px] font-semibold text-strong">{formatMoney(expense.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Date</p>
                      <p className="text-[13px] text-strong">{formatDate(expense.expenseDate)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Category</p>
                      <div className="flex items-center gap-2">
                        {expense.category && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: expense.category.color }}
                          />
                        )}
                        <p className="text-[13px] text-strong">{expense.category?.name ?? <span className="text-muted/50 italic">Uncategorized</span>}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted mb-0.5">Currency</p>
                      <p className="text-[13px] text-strong">{expense.currency}</p>
                    </div>
                  </div>
                </div>

                {expense.notes && (
                  <>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
                      <p className="text-[13px] text-strong leading-relaxed">{expense.notes}</p>
                    </div>
                  </>
                )}

                {expense.invoiceUrl && (
                  <>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Invoice</p>
                      <a
                        href={expense.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                      >
                        <ExternalLink size={13} />
                        View Invoice
                      </a>
                    </div>
                  </>
                )}

                {expense.approvedBy && (
                  <>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        {expense.status === 'APPROVED' ? 'Approved By' : 'Reviewed By'}
                      </p>
                      <p className="text-[13px] text-strong">
                        {expense.approvedBy.firstName} {expense.approvedBy.lastName}
                      </p>
                      {expense.approvedAt && (
                        <p className="text-[11px] text-muted mt-0.5">{formatDate(expense.approvedAt)}</p>
                      )}
                    </div>
                  </>
                )}

                {expense.status === 'REJECTED' && expense.rejectReason && (
                  <>
                    <div className="border-t border-divider" />
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        Rejection Reason
                      </p>
                      <p className="text-[13px] text-strong leading-relaxed bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                        {expense.rejectReason}
                      </p>
                    </div>
                  </>
                )}
              </Card>

              {/* Sidebar */}
              <div className="w-72 shrink-0 space-y-4">
                {/* Status card */}
                <Card className="p-5">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Status</p>
                  <Badge variant={STATUS_BADGE[expense.status]}>{expense.status}</Badge>
                  <p className="text-[12px] text-muted mt-2 leading-relaxed">
                    {expense.status === 'PENDING' && 'Awaiting manager review.'}
                    {expense.status === 'APPROVED' && 'This expense has been approved.'}
                    {expense.status === 'REJECTED' && 'This expense was not approved.'}
                  </p>
                </Card>

                {/* Approval actions — only shown to managers on pending expenses */}
                {canApprove && expense.status === 'PENDING' && (
                  <Card className="p-5">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Actions</p>

                    {rejectOpen ? (
                      // Reject confirmation panel
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[12px] text-muted mb-1.5">
                            Rejection reason (optional)
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={2}
                            placeholder="Explain why this is being rejected..."
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-danger/40 bg-surface text-strong resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => rejectMutation.mutate(rejectReason || undefined)}
                            disabled={rejectMutation.isPending}
                            className="flex-1 py-2 rounded-lg text-[13px] font-medium bg-danger text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                          <button
                            onClick={() => { setRejectOpen(false); setRejectReason('') }}
                            className="px-4 py-2 rounded-lg text-[13px] font-medium border border-border text-muted hover:bg-canvas transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Default action buttons
                      <div className="space-y-2">
                        <button
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium bg-success text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          {approveMutation.isPending ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium border border-danger/40 text-danger hover:bg-danger-soft transition-colors"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
