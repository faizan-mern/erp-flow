'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Paperclip, CheckCircle2, Loader2 } from 'lucide-react'
import {
  submitExpense, uploadInvoice, fetchCategories,
  SubmitExpenseData, ExpenseCategory,
} from '@/lib/expenses'
import { toast } from '@/store/toast.store'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

type FormState = {
  title: string
  amount: string
  categoryId: string
  expenseDate: string
  notes: string
}

// Default the date picker to today in YYYY-MM-DD format (required by <input type="date">)
const today = new Date().toISOString().slice(0, 10)

const EMPTY: FormState = {
  title: '',
  amount: '',
  categoryId: '',
  expenseDate: today,
  notes: '',
}

export default function NewExpensePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [error, setError] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchCategories,
  })

  const submitMutation = useMutation({
    mutationFn: (data: SubmitExpenseData) => submitExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense submitted successfully')
      router.push('/dashboard/expenses')
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit expense.'
      setError(message)
    },
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Auto-upload on file pick: fires uploadInvoice immediately, sets invoiceUrl on success.
  // The submit button remains enabled throughout — user can fill the rest of the form while uploading.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setUploadError('')
    try {
      const url = await uploadInvoice(file)
      setInvoiceUrl(url)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    submitMutation.mutate({
      title: form.title,
      amount: Number(form.amount),
      categoryId: form.categoryId || undefined,
      expenseDate: new Date(form.expenseDate).toISOString(),
      notes: form.notes || undefined,
      invoiceUrl: invoiceUrl || undefined,
    })
  }

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
          <span className="text-strong font-medium">Submit Expense</span>
        </div>

        <PageHeader
          title="Submit Expense"
          subtitle="Fill in the details and attach an invoice if available."
        />

        <div className="flex gap-6 items-start">
          <Card className="flex-1 min-w-0 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Details</p>
                <div className="space-y-4 max-w-xl">
                  <Field label="Title">
                    <Input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Team lunch, Office supplies"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Amount (PKR)">
                      <Input
                        name="amount"
                        type="number"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="e.g. 5000"
                        required
                      />
                    </Field>
                    <Field label="Date">
                      <Input
                        name="expenseDate"
                        type="date"
                        value={form.expenseDate}
                        onChange={handleChange}
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Category">
                    <select
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong"
                    >
                      <option value="">— Select category —</option>
                      {(categories as ExpenseCategory[]).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="border-t border-divider" />

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Notes & Invoice</p>
                <div className="space-y-4 max-w-xl">
                  <Field label="Notes" hint="Any context that helps the approver understand this expense.">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Client meeting at Café, receipt attached"
                      className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong resize-none"
                    />
                  </Field>

                  {/* File upload — auto-uploads on pick, shows checkmark when done */}
                  <Field label="Invoice (optional)">
                    <div>
                      {invoiceUrl ? (
                        // Success state: show green tick + "Remove" link
                        <div className="flex items-center gap-2 text-[13px] text-success">
                          <CheckCircle2 size={15} />
                          <span>Invoice uploaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceUrl(null)
                              if (fileRef.current) fileRef.current.value = ''
                            }}
                            className="text-muted hover:text-strong ml-1 text-[11px] underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        // Idle / uploading state
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-[13px] text-muted hover:bg-canvas hover:text-strong transition-colors disabled:opacity-50"
                          >
                            {isUploading
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Paperclip size={14} />
                            }
                            {isUploading ? 'Uploading...' : 'Attach file'}
                          </button>
                          <span className="text-[12px] text-muted">PDF, PNG, JPG — max 10 MB</span>
                        </div>
                      )}
                      {/* Hidden file input — triggered via ref click above */}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {uploadError && (
                        <p className="text-[12px] text-danger mt-1.5">{uploadError}</p>
                      )}
                    </div>
                  </Field>
                </div>
              </div>

              {error && (
                <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={submitMutation.isPending || isUploading}>
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Expense'}
                </Button>
                <Link
                  href="/dashboard/expenses"
                  className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </Card>

          {/* Sidebar — how it works */}
          <div className="w-72 shrink-0">
            <Card className="p-5">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">How it works</p>
              <div className="space-y-3 text-[13px] text-muted">
                {[
                  'Submit your expense with amount and optional invoice',
                  'A manager or admin reviews and approves or rejects it',
                  'You\'ll see the updated status in your expense list',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-divider mt-4 pt-4">
                <p className="text-[12px] text-muted leading-relaxed">
                  Category is optional — the AI assistant may auto-suggest one based on your title.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
