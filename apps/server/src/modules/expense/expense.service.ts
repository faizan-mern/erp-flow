import { ExpenseStatus, Role } from '@prisma/client'
import * as repo from './expense.repository'
import { categorizeExpense } from '../../lib/openrouter'
import { CreateExpenseInput, UpdateExpenseInput, ListExpensesQueryInput } from './expense.validator'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

// ─── STATE MACHINE ──────────────────────────────────────────────────────────
// All state transitions go through this guard. Anything not explicitly listed
// is forbidden — the only legal moves are PENDING → APPROVED and PENDING → REJECTED.
function assertTransition(current: ExpenseStatus, to: ExpenseStatus) {
  const allowed: Record<ExpenseStatus, ExpenseStatus[]> = {
    PENDING:  ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: [],
  }
  if (!allowed[current].includes(to)) {
    fail(`Cannot transition expense from ${current} to ${to}`, 409)
  }
}

// ─── READ ───────────────────────────────────────────────────────────────────

export async function listExpensesForRequester(
  companyId: string,
  filters: ListExpensesQueryInput,
  requester: { role: Role; employeeId: string | null }
) {
  // EMPLOYEEs only ever see their own expenses. MANAGER and COMPANY_ADMIN see all.
  const scope = requester.role === 'EMPLOYEE'
    ? { employeeId: requester.employeeId ?? '__none__' } // __none__ guarantees zero results if no employee row
    : {}
  return repo.listExpenses(companyId, filters, scope)
}

export async function getExpenseForRequester(
  id: string,
  companyId: string,
  requester: { role: Role; employeeId: string | null }
) {
  const expense = await repo.findExpenseById(id, companyId)
  if (!expense) fail('Expense not found', 404)

  if (requester.role === 'EMPLOYEE' && expense.employeeId !== requester.employeeId) {
    fail('Forbidden — you can only view your own expenses', 403)
  }
  return expense
}

// ─── SUBMIT ─────────────────────────────────────────────────────────────────

export async function submitExpense(
  companyId: string,
  employeeId: string,
  data: CreateExpenseInput
) {
  // 1. Create the row immediately (always PENDING — set by schema default).
  const expense = await repo.createExpense(companyId, employeeId, data)

  // 2. Fire-and-forget AI categorization. We do NOT await this. If it succeeds,
  //    a follow-up DB write fills in categoryId. If it fails, the expense stays
  //    in whatever category the user picked (or null = Uncategorized).
  if (!data.categoryId) {
    void runAiCategorization(companyId, expense.id, data.title, data.notes ?? null)
  }

  return expense
}

async function runAiCategorization(
  companyId: string,
  expenseId: string,
  title: string,
  notes: string | null
) {
  try {
    const categories = await repo.listCategoriesForCompany(companyId)
    if (categories.length === 0) return

    const pickedName = await categorizeExpense(title, notes, categories)
    if (!pickedName) return

    const category = await repo.findCategoryByName(companyId, pickedName)
    if (!category) return

    await repo.updateCategory(expenseId, companyId, category.id)
  } catch (err) {
    console.warn('[AI] runAiCategorization failed:', (err as Error).message)
  }
}

// ─── EDIT (while PENDING, only by submitter) ────────────────────────────────

export async function updateExpense(
  id: string,
  companyId: string,
  requesterEmployeeId: string | null,
  data: UpdateExpenseInput
) {
  const expense = await repo.findExpenseById(id, companyId)
  if (!expense) fail('Expense not found', 404)
  if (expense.status !== 'PENDING') {
    fail('Cannot edit an expense that has been approved or rejected', 409)
  }
  if (expense.employeeId !== requesterEmployeeId) {
    fail('Forbidden — only the submitter can edit a pending expense', 403)
  }
  return repo.updateExpense(id, companyId, data)
}

// ─── APPROVE / REJECT (segregation of duties enforced) ──────────────────────

export async function approveExpense(
  id: string,
  companyId: string,
  approverId: string,
  approverEmployeeId: string | null
) {
  const expense = await repo.findExpenseById(id, companyId)
  if (!expense) fail('Expense not found', 404)
  assertTransition(expense.status, 'APPROVED')

  // Segregation of duties: the user who submitted cannot also approve.
  if (approverEmployeeId && expense.employeeId === approverEmployeeId) {
    fail('Forbidden — you cannot approve your own expense', 403)
  }

  return repo.updateStatus(id, companyId, 'APPROVED', approverId)
}

export async function rejectExpense(
  id: string,
  companyId: string,
  approverId: string,
  approverEmployeeId: string | null,
  reason: string | undefined,
) {
  const expense = await repo.findExpenseById(id, companyId)
  if (!expense) fail('Expense not found', 404)
  assertTransition(expense.status, 'REJECTED')

  if (approverEmployeeId && expense.employeeId === approverEmployeeId) {
    fail('Forbidden — you cannot reject your own expense', 403)
  }

  return repo.updateStatus(id, companyId, 'REJECTED', approverId, reason)
}

// ─── ANALYTICS + CATEGORIES ─────────────────────────────────────────────────

export async function getMonthlyAnalytics(companyId: string, year?: number, month?: number) {
  // Default range: current calendar month in UTC. Frontend can override.
  const now = new Date()
  const y = year  ?? now.getUTCFullYear()
  const m = month ?? now.getUTCMonth() + 1

  const from = new Date(Date.UTC(y, m - 1, 1))
  const to   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))

  const data = await repo.analytics(companyId, from, to)
  return { from, to, ...data }
}

export async function listCategories(companyId: string) {
  return repo.listCategoriesForCompany(companyId)
}
