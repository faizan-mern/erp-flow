import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import * as repo from './user.repository'
import { InviteUserInput, UpdateUserInput } from './user.validator'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

export async function listUsers(companyId: string) {
  return repo.listUsersForCompany(companyId)
}

export async function inviteUser(companyId: string, data: InviteUserInput) {
  const existing = await repo.findUserByEmail(data.email, companyId)
  if (existing) fail('A user with this email already exists in your company', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)
  return repo.createUserWithEmployee(companyId, {
    email: data.email,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role as Role,
  })
}

export async function updateUser(
  id: string,
  companyId: string,
  callerId: string,
  data: UpdateUserInput
) {
  // Block self-role-change: prevents the only admin from accidentally demoting
  // themselves and leaving the company with no admin.
  if (id === callerId && data.role !== undefined) {
    fail('You cannot change your own role — ask another admin', 403)
  }

  const target = await repo.findUserById(id, companyId)
  if (!target) fail('User not found', 404)

  return repo.updateUser(id, companyId, data)
}
