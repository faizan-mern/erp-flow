import api from './api'

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ExpenseCategory {
  id: string
  name: string
  color: string
}

export interface Expense {
  id: string
  companyId: string
  employeeId: string
  categoryId: string | null
  title: string
  // Prisma Decimal serializes to string over JSON — use formatMoney() to display.
  amount: string
  currency: string
  status: ExpenseStatus
  approvedById: string | null
  approvedAt: string | null
  invoiceUrl: string | null
  notes: string | null
  expenseDate: string
  createdAt: string
  updatedAt: string
  category: ExpenseCategory | null
  employee: { id: string; firstName: string; lastName: string }
  approvedBy: { id: string; firstName: string; lastName: string } | null
}

export interface ExpenseListResponse {
  expenses: Expense[]
  total: number
  page: number
  limit: number
}

export interface SubmitExpenseData {
  title: string
  amount: number
  categoryId?: string
  expenseDate: string   // ISO 8601
  notes?: string
  invoiceUrl?: string
}

export type UpdateExpenseData = Partial<SubmitExpenseData>

export interface ListExpensesParams {
  page?: number
  limit?: number
  status?: ExpenseStatus
  categoryId?: string
  from?: string
  to?: string
  search?: string
}

export interface MonthlyAnalytics {
  from: string
  to: string
  byStatus: { status: ExpenseStatus; total: number; count: number }[]
  byCategory: {
    categoryId: string | null
    name: string
    color: string
    total: number
    count: number
  }[]
}

// ─── READ ───────────────────────────────────────────────────────────────────

export async function fetchExpenses(params?: ListExpensesParams): Promise<ExpenseListResponse> {
  const res = await api.get('/api/v1/expenses', { params })
  return res.data.data
}

export async function fetchExpense(id: string): Promise<Expense> {
  const res = await api.get(`/api/v1/expenses/${id}`)
  return res.data.data
}

export async function fetchCategories(): Promise<ExpenseCategory[]> {
  const res = await api.get('/api/v1/expenses/categories')
  return res.data.data
}

export async function fetchMonthlyAnalytics(year?: number, month?: number): Promise<MonthlyAnalytics> {
  const res = await api.get('/api/v1/expenses/analytics/monthly', {
    params: { ...(year && { year }), ...(month && { month }) },
  })
  return res.data.data
}

// ─── WRITE ──────────────────────────────────────────────────────────────────

export async function submitExpense(data: SubmitExpenseData): Promise<Expense> {
  const res = await api.post('/api/v1/expenses', data)
  return res.data.data
}

export async function updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
  const res = await api.put(`/api/v1/expenses/${id}`, data)
  return res.data.data
}

export async function approveExpense(id: string): Promise<Expense> {
  const res = await api.post(`/api/v1/expenses/${id}/approve`)
  return res.data.data
}

export async function rejectExpense(id: string, reason?: string): Promise<Expense> {
  const res = await api.post(`/api/v1/expenses/${id}/reject`, reason ? { reason } : {})
  return res.data.data
}

// ─── FILE UPLOAD ────────────────────────────────────────────────────────────
// Returns the Cloudinary URL. Pass it as `invoiceUrl` when calling submitExpense.

export async function uploadInvoice(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post('/api/v1/expenses/upload-invoice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data.url
}
