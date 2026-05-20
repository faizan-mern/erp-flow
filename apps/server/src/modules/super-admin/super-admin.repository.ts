import { prisma } from '../../prisma/client'

const PLATFORM_SLUG = '__platform__'
const notPlatform = { not: PLATFORM_SLUG }

export async function listAllCompanies(page: number, limit: number, search?: string) {
  const where = {
    slug: notPlatform,
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  }
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { _count: { select: { users: true, employees: true, expenses: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ])
  return { companies, total }
}

export async function getPlatformStats() {
  const [totalCompanies, activeCompanies, totalUsers, totalExpenses, totalEmployees] =
    await Promise.all([
      prisma.company.count({ where: { slug: notPlatform } }),
      prisma.company.count({ where: { slug: notPlatform, isActive: true } }),
      prisma.user.count({ where: { company: { slug: notPlatform } } }),
      prisma.expense.count(),
      prisma.employee.count(),
    ])
  return { totalCompanies, activeCompanies, totalUsers, totalExpenses, totalEmployees }
}

export async function findCompanyById(id: string) {
  return prisma.company.findFirst({ where: { id, slug: notPlatform } })
}

export async function toggleCompanyActive(id: string, isActive: boolean) {
  return prisma.company.update({ where: { id }, data: { isActive } })
}
