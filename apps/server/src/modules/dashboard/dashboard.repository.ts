import { prisma } from '../../prisma/client'

export async function getStats(companyId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [
    employeeTotal,
    employeeActive,
    expenseByStatus,
    monthlyExpenses,
    expenseByCategoryRaw,
    categories,
    inventoryValueRaw,
    lowStockRaw,
    attendanceRaw,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId, isActive: true } }),

    prisma.expense.groupBy({
      by: ['status'],
      where: { companyId },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    // Raw SQL needed: Prisma groupBy cannot group by DATE_TRUNC of a field.
    prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "expenseDate"), 'YYYY-MM') AS month,
        COALESCE(SUM(amount), 0)::float                        AS total,
        COUNT(*)::int                                           AS count
      FROM expenses
      WHERE "companyId" = ${companyId}
        AND "expenseDate" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "expenseDate")
      ORDER BY DATE_TRUNC('month', "expenseDate")
    `,

    prisma.expense.groupBy({
      by: ['categoryId'],
      where: { companyId, status: 'APPROVED' },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.expenseCategory.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true },
    }),

    // Raw SQL needed: SUM of quantity * unitPrice requires column arithmetic.
    prisma.$queryRaw<[{ value: number }]>`
      SELECT COALESCE(SUM(quantity::float * "unitPrice"::float), 0) AS value
      FROM products
      WHERE "companyId" = ${companyId} AND "isActive" = true
    `,

    // Raw SQL needed: Prisma count cannot compare two columns on the same row.
    prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE "companyId" = ${companyId}
        AND "isActive" = true
        AND quantity <= "lowStockThreshold"
    `,

    prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { companyId, date: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
  ])

  const statusMap = Object.fromEntries(
    expenseByStatus.map((r) => [
      r.status,
      { count: r._count._all, total: Number(r._sum.amount ?? 0) },
    ])
  )

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const byCategory = expenseByCategoryRaw
    .filter((r) => Number(r._sum.amount ?? 0) > 0)
    .map((r) => {
      const cat = r.categoryId ? categoryMap.get(r.categoryId) : null
      return {
        name:  cat?.name  ?? 'Uncategorized',
        color: cat?.color ?? '#94a3b8',
        total: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }
    })

  // Build lookup keyed by "YYYY-MM-DD" → { present, absent, late }
  const attendanceMap = new Map<string, { present: number; absent: number; late: number }>()
  for (const row of attendanceRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10)
    if (!attendanceMap.has(key)) attendanceMap.set(key, { present: 0, absent: 0, late: 0 })
    const entry = attendanceMap.get(key)!
    if (row.status === 'PRESENT')  entry.present += row._count._all
    else if (row.status === 'ABSENT') entry.absent += row._count._all
    else if (row.status === 'LATE')   entry.late   += row._count._all
  }

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const attendance = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const entry = attendanceMap.get(key) ?? { present: 0, absent: 0, late: 0 }
    attendance.push({ date: DAY_LABELS[d.getDay()], ...entry })
  }

  return {
    employees: { total: employeeTotal, active: employeeActive },
    expenses: {
      pending:    statusMap['PENDING']  ?? { count: 0, total: 0 },
      approved:   statusMap['APPROVED'] ?? { count: 0, total: 0 },
      rejected:   statusMap['REJECTED'] ?? { count: 0, total: 0 },
      monthly:    monthlyExpenses,
      byCategory,
    },
    inventory: {
      totalValue:    Number(inventoryValueRaw[0]?.value ?? 0),
      lowStockCount: Number(lowStockRaw[0]?.count ?? 0),
    },
    attendance,
  }
}

export async function getActivity(companyId: string) {
  return prisma.activityLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id:           true,
      action:       true,
      resourceType: true,
      details:      true,
      createdAt:    true,
      user: { select: { firstName: true, lastName: true } },
    },
  })
}
