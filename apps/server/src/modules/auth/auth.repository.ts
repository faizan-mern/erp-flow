import { prisma } from '../../prisma/client'
import { Role } from '@prisma/client'

// Default expense categories seeded for every new company. The AI categorizer
// is constrained to pick a name from this list, so keep it short and broad.
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Travel',    color: '#0ea5e9' },
  { name: 'Meals',     color: '#f59e0b' },
  { name: 'Office',    color: '#64748b' },
  { name: 'Software',  color: '#8b5cf6' },
  { name: 'Marketing', color: '#ec4899' },
  { name: 'Utilities', color: '#10b981' },
  { name: 'Other',     color: '#94a3b8' },
]

export async function findCompanyBySlug(slug: string) {
  return prisma.company.findUnique({ where: { slug } })
}

export async function createCompanyAndAdmin(data: {
  companyName: string
  companySlug: string
  firstName: string
  lastName: string
  email: string
  passwordHash: string
  verifyToken: string
}) {
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: data.companyName, slug: data.companySlug },
    })
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: Role.COMPANY_ADMIN,
        verifyToken: data.verifyToken,
      },
    })
    const employee = await tx.employee.create({
      data: {
        companyId: company.id,
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    })
    await tx.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, companyId: company.id })),
    })
    return { company, user, employee }
  })
}

export async function findUserByEmail(email: string, companyId: string) {
  return prisma.user.findUnique({ where: { email_companyId: { email, companyId } } })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function verifyUserEmail(token: string) {
  return prisma.user.updateMany({
    where: { verifyToken: token, isVerified: false },
    data: { isVerified: true, verifyToken: null },
  })
}

export async function setResetToken(userId: string, token: string, expiry: Date) {
  return prisma.user.update({
    where: { id: userId },
    data: { resetToken: token, resetTokenExp: expiry },
  })
}

export async function findUserByResetToken(token: string) {
  return prisma.user.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  })
}

export async function updatePassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  })
}

export async function updateLastLogin(userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
}

export async function saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date, deviceInfo?: string) {
  return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt, deviceInfo } })
}

export async function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } })
}

export async function deleteRefreshToken(tokenHash: string) {
  return prisma.refreshToken.deleteMany({ where: { tokenHash } })
}

export async function deleteAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.deleteMany({ where: { userId } })
}
