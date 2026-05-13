import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import * as repo from './auth.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email'
import { RegisterInput, LoginInput } from './auth.validator'

export async function register(input: RegisterInput) {
  const existingCompany = await repo.findCompanyBySlug(input.companySlug)
  if (existingCompany) throw new Error('Company slug already taken')

  const passwordHash = await bcrypt.hash(input.password, 12)
  const verifyToken = crypto.randomBytes(32).toString('hex')

  const { user, company } = await repo.createCompanyAndAdmin({
    companyName: input.companyName,
    companySlug: input.companySlug,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    passwordHash,
    verifyToken,
  })

  await sendVerificationEmail(user.email, verifyToken).catch(() => {
    // Email failure shouldn't break registration — user can request resend
    console.warn('Verification email failed to send for:', user.email)
  })

  return { companyId: company.id, userId: user.id, email: user.email }
}

export async function login(input: LoginInput, deviceInfo?: string) {
  const company = await repo.findCompanyBySlug(input.companySlug)
  if (!company) throw new Error('Company not found')

  const user = await repo.findUserByEmail(input.email, company.id)
  if (!user) throw new Error('Invalid email or password')

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatch) throw new Error('Invalid email or password')

  if (!user.isVerified) throw new Error('Please verify your email before logging in')

  const payload = { userId: user.id, companyId: company.id, role: user.role, email: user.email }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Store hashed refresh token — never store raw tokens in DB
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await repo.saveRefreshToken(user.id, tokenHash, expiresAt, deviceInfo)
  await repo.updateLastLogin(user.id)

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  }
}

export async function refresh(rawRefreshToken: string) {
  // Verify the token is cryptographically valid first
  const payload = verifyRefreshToken(rawRefreshToken)

  // Then check it exists in DB (it may have been revoked via logout)
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex')
  const stored = await repo.findRefreshToken(tokenHash)
  if (!stored || stored.expiresAt < new Date()) throw new Error('Refresh token invalid or expired')

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

export async function logout(rawRefreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex')
  await repo.deleteRefreshToken(tokenHash)
}

export async function verifyEmail(token: string) {
  const result = await repo.verifyUserEmail(token)
  if (result.count === 0) throw new Error('Invalid or already used verification token')
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
  if (!user) throw new Error('Invalid or expired reset token')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await repo.updatePassword(user.id, passwordHash)
}
