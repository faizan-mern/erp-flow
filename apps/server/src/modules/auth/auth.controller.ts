import { Request, Response, NextFunction } from 'express'
import * as service from './auth.service'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validator'
import { sendSuccess, sendError } from '../../utils/response'
import { AuthRequest } from '../../types'

// In production the frontend (Vercel) and backend (Railway) live on different
// origins, so the refresh-token cookie must be sameSite=none + secure to be sent
// on cross-site requests. Locally we use 'strict' since both run on localhost.
const isProd = process.env.NODE_ENV === 'production'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body)
    const result = await service.register(input)
    sendSuccess(res, result, 'Company registered. Please check your email to verify your account.', 201)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body)
    const deviceInfo = req.headers['user-agent']
    const { accessToken, refreshToken, user } = await service.login(input, deviceInfo)

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    sendSuccess(res, { accessToken, user }, 'Logged in successfully')
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken
    if (!token) { sendError(res, 'No refresh token', 401); return }

    const { accessToken, refreshToken } = await service.refresh(token)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    sendSuccess(res, { accessToken }, 'Token refreshed')
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken
    if (token) await service.logout(token)
    res.clearCookie('refreshToken')
    sendSuccess(res, null, 'Logged out successfully')
  } catch (err) {
    next(err)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await service.verifyEmail(req.params.token as string)
    sendSuccess(res, null, 'Email verified. You can now log in.')
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, companySlug } = forgotPasswordSchema.parse(req.body)
    await service.forgotPassword(email, companySlug)
    // Always return success — don't reveal if email exists
    sendSuccess(res, null, 'If that account exists, a reset email has been sent.')
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body)
    await service.resetPassword(token, password)
    sendSuccess(res, null, 'Password reset successfully. You can now log in.')
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, req.user, 'Current user')
  } catch (err) {
    next(err)
  }
}
