import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import * as repo from './auth.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt'
import { sendPasswordResetEmail } from '../../utils/email'
import { logActivity } from '../../utils/activity'
import { RegisterInput, LoginInput } from './auth.validator'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

export async function register(input: RegisterInput, deviceInfo?: string, ipAddress?: string) {
  const existingCompany = await repo.findCompanyBySlug(input.companySlug)
  if (existingCompany) fail('Company slug already taken', 409)

  const passwordHash = await bcrypt.hash(input.password, 12)
  const verifyToken = crypto.randomBytes(32).toString('hex')

  const { user, company, employee } = await repo.createCompanyAndAdmin({
    companyName: input.companyName,
    companySlug: input.companySlug,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    passwordHash,
    verifyToken,
  })

  const payload = { userId: user.id, companyId: company.id, role: user.role, email: user.email }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await repo.saveRefreshToken(user.id, tokenHash, expiresAt, deviceInfo)

  logActivity({
    companyId: company.id,
    userId: user.id,
    action: 'REGISTER',
    resourceType: 'company',
    resourceId: company.id,
    details: { email: user.email, slug: input.companySlug },
    ipAddress,
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyName: company.name,
      companySlug: company.slug,
      employeeId: employee.id,
    },
  }
}

export async function login(input: LoginInput, deviceInfo?: string, ipAddress?: string) {
  const company = await repo.findCompanyBySlug(input.companySlug)
  if (!company) fail('Company not found', 404)

  const user = await repo.findUserByEmail(input.email, company.id)
  if (!user) fail('Invalid email or password', 401)

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatch) fail('Invalid email or password', 401)

  if (!user.isVerified) fail('Please verify your email before logging in', 403)

  const payload = { userId: user.id, companyId: company.id, role: user.role, email: user.email }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Store hashed refresh token — never store raw tokens in DB
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await repo.saveRefreshToken(user.id, tokenHash, expiresAt, deviceInfo)
  await repo.updateLastLogin(user.id)

  logActivity({
    companyId: company.id,
    userId: user.id,
    action: 'LOGIN',
    resourceType: 'session',
    resourceId: user.id,
    details: deviceInfo ? { deviceInfo } : undefined,
    ipAddress,
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyName: company.name,
      companySlug: company.slug,
      // Exposed so the frontend can compare it against expense.employeeId for
      // self-approval UI gating. Backend still enforces segregation of duties.
      employeeId: user.employee?.id ?? null,
    },
  }
}

export async function refresh(rawRefreshToken: string) {
  // Verify the token is cryptographically valid first
  const payload = verifyRefreshToken(rawRefreshToken)

  // Then check it exists in DB (it may have been revoked via logout)
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex')
  const stored = await repo.findRefreshToken(tokenHash)
  if (!stored || stored.expiresAt < new Date()) fail('Refresh token invalid or expired', 401)

  // Rotate: delete old token, issue new pair
  await repo.deleteRefreshToken(tokenHash)

  const newPayload = { userId: payload.userId, companyId: payload.companyId, role: payload.role, email: payload.email }
  const newAccessToken = signAccessToken(newPayload)
  const newRefreshToken = signRefreshToken(newPayload)

  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await repo.saveRefreshToken(payload.userId, newTokenHash, expiresAt)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout(rawRefreshToken: string, ipAddress?: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex')

  // Look up the token's owner BEFORE deleting it so we can attribute the
  // logout activity to the right user. We tolerate "token not found" silently
  // because the controller will then just clear the cookie and be done.
  const stored = await repo.findRefreshToken(tokenHash).catch(() => null)

  await repo.deleteRefreshToken(tokenHash)

  if (stored?.user) {
    logActivity({
      companyId: stored.user.companyId,
      userId: stored.user.id,
      action: 'LOGOUT',
      resourceType: 'session',
      resourceId: stored.user.id,
      ipAddress,
    })
  }
}

export async function verifyEmail(token: string) {
  const result = await repo.verifyUserEmail(token)
  if (result.count === 0) fail('Invalid or already used verification token', 400)
}

export async function forgotPassword(email: string, companySlug: string) {
  const company = await repo.findCompanyBySlug(companySlug)
  if (!company) return // Don't reveal if company/email exists — security best practice

  const user = await repo.findUserByEmail(email, company.id)
  if (!user) return

  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 60 * 60 * 1000)
  await repo.setResetToken(user.id, token, expiry)
  await sendPasswordResetEmail(user.email, token).catch(console.warn)
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await repo.findUserByResetToken(token)
  if (!user) fail('Invalid or expired reset token', 400)

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await repo.updatePassword(user.id, passwordHash)
}
