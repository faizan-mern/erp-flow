import { Role } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { UpdateUserInput } from './user.validator'

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isVerified: true,
  lastLoginAt: true,
  createdAt: true,
  employee: { select: { id: true, isActive: true } },
} as const

export async function listUsersForCompany(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
    select: USER_SELECT,
  })
}

export async function findUserById(id: string, companyId: string) {
  return prisma.user.findFirst({
    where: { id, companyId },
    select: USER_SELECT,
  })
}

export async function findUserByEmail(email: string, companyId: string) {
  return prisma.user.findUnique({
    where: { email_companyId: { email, companyId } },
    select: { id: true },
  })
}

// Single transaction: create User + linked Employee. Mirrors register flow so
// invited users can immediately submit expenses and use attendance.
export async function createUserWithEmployee(
  companyId: string,
  data: {
    email: string
    passwordHash: string
    firstName: string
    lastName: string
    role: Role
  }
) {
  const userId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        companyId,
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isVerified: true,
      },
      select: { id: true },
    })
    await tx.employee.create({
      data: {
        companyId,
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    })
    return user.id
  })

  // Re-fetch after the txn so the employee relation is populated in the response.
  return findUserById(userId, companyId)
}

export async function updateUser(id: string, companyId: string, data: UpdateUserInput) {
  // updateMany so the WHERE clause includes companyId (defense in depth).
  // prisma.user.update doesn't allow composite where without a unique constraint.
  await prisma.user.updateMany({
    where: { id, companyId },
    data: {
      ...(data.role     !== undefined && { role: data.role }),
      ...(data.isActive !== undefined && {
        employee: undefined, // not editing employee here — clarity only
      }),
    },
  })
  return findUserById(id, companyId)
}
