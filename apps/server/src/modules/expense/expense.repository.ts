import { Prisma, ExpenseStatus } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateExpenseInput, UpdateExpenseInput, ListExpensesQueryInput } from './expense.validator'

const EXPENSE_INCLUDE = {
  category:   { select: { id: true, name: true, color: true } },
  employee:   { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude

export async function listExpenses(
  companyId: string,
  filters: ListExpensesQueryInput,
  scope: { employeeId?: string } = {}
) {
  const where: Prisma.ExpenseWhereInput = {
    companyId,
    ...(scope.employeeId && { employeeId: scope.employeeId }),
    ...(filters.status     && { status: filters.status }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...((filters.from || filters.to) && {
      expenseDate: {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to   && { lte: new Date(filters.to) }),
      },
    }),
    ...(filters.search && {
      title: { contains: filters.search, mode: 'insensitive' },
    }),
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: EXPENSE_INCLUDE,
    }),
    prisma.expense.count({ where }),
  ])

  return { expenses, total, page: filters.page, limit: filters.limit }
}

export async function findExpenseById(id: string, companyId: string) {
  return prisma.expense.findFirst({
    where: { id, companyId },
    include: EXPENSE_INCLUDE,
  })
}

export async function createExpense(
  companyId: string,
  employeeId: string,
  data: CreateExpenseInput
) {
  return prisma.expense.create({
    data: {
      companyId,
      employeeId,
      title:       data.title,
      amount:      data.amount,
      categoryId:  data.categoryId,
      expenseDate: new Date(data.expenseDate),
      notes:       data.notes,
      invoiceUrl:  data.invoiceUrl,
      // status defaults to PENDING via schema
    },
    include: EXPENSE_INCLUDE,
  })
}

export async function updateExpense(id: string, companyId: string, data: UpdateExpenseInput) {
  // updateMany so companyId is enforced in the WHERE clause — defense in depth
  // even though the service layer pre-checks ownership.
  await prisma.expense.updateMany({
    where: { id, companyId },
    data: {
      ...(data.title       !== undefined && { title: data.title }),
      ...(data.amount      !== undefined && { amount: data.amount }),
      ...(data.categoryId  !== undefined && { categoryId: data.categoryId }),
      ...(data.expenseDate !== undefined && { expenseDate: new Date(data.expenseDate) }),
      ...(data.notes       !== undefined && { notes: data.notes }),
      ...(data.invoiceUrl  !== undefined && { invoiceUrl: data.invoiceUrl }),
    },
  })
  return findExpenseById(id, companyId)
}

export async function updateStatus(
  id: string,
  companyId: string,
  status: ExpenseStatus,
  approvedById: string
) {
  await prisma.expense.updateMany({
    where: { id, companyId },
    data: {
      status,
      approvedById,
      approvedAt: new Date(),
    },
  })
  return findExpenseById(id, companyId)
}

// Used by the async AI categorizer — never blocks the main submit response.
export async function updateCategory(id: string, companyId: string, categoryId: string) {
  await prisma.expense.updateMany({
    where: { id, companyId },
    data: { categoryId },
  })
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export async function listCategoriesForCompany(companyId: string) {
  return prisma.expenseCategory.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, color: true },
  })
}

export async function findCategoryByName(companyId: string, name: string) {
  return prisma.expenseCategory.findFirst({
    where: { companyId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────
// Returns: { byStatus: [{status, total, count}], byCategory: [{categoryId, name, total, count}] }
// Both scoped to the date range. Used by /expenses/analytics/monthly.

export async function analytics(companyId: string, from: Date, to: Date) {
  const dateFilter = { companyId, expenseDate: { gte: from, lte: to } }

  const [byStatusRaw, byCategoryRaw, categories] = await Promise.all([
    prisma.expense.groupBy({
      by: ['status'],
      where: dateFilter,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: { ...dateFilter, status: 'APPROVED' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expenseCategory.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true },
    }),
  ])

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return {
    byStatus: byStatusRaw.map((r) => ({
      status: r.status,
      total: Number(r._sum.amount ?? 0),
      count: r._count._all,
    })),
    byCategory: byCategoryRaw.map((r) => {
      const cat = r.categoryId ? categoryMap.get(r.categoryId) : null
      return {
        categoryId: r.categoryId,
        name:  cat?.name  ?? 'Uncategorized',
        color: cat?.color ?? '#94a3b8',
        total: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }
    }),
  }
}
