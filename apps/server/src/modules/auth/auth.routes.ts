import { Router } from 'express'
import * as controller from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../../types'

const router = Router()

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new company and admin user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, firstName, lastName, email, password]
 *             properties:
 *               companyName: { type: string, example: Acme Corp }
 *               firstName:   { type: string, example: John }
 *               lastName:    { type: string, example: Doe }
 *               email:       { type: string, format: email }
 *               password:    { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Company and admin user created; tokens set in cookies
 *       400:
 *         description: Validation error or email already exists
 */
router.post('/register', controller.register)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive JWT cookies
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, companySlug]
 *             properties:
 *               email:       { type: string, format: email }
 *               password:    { type: string }
 *               companySlug: { type: string, example: acme-corp }
 *     responses:
 *       200:
 *         description: Authenticated; accessToken + refreshToken set as httpOnly cookies
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', controller.login)

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh the access token using the refresh cookie
 *     security: []
 *     responses:
 *       200:
 *         description: New accessToken cookie issued
 *       401:
 *         description: Missing or invalid refresh token
 */
router.post('/refresh', controller.refresh)

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — revoke refresh token and clear cookies
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', controller.logout)

/**
 * @openapi
 * /auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address via token link
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email/:token', controller.verifyEmail)

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, companySlug]
 *             properties:
 *               email:       { type: string, format: email }
 *               companySlug: { type: string }
 *     responses:
 *       200:
 *         description: Reset email sent (always 200 to avoid user enumeration)
 */
router.post('/forgot-password', controller.forgotPassword)

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the emailed token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:    { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', controller.resetPassword)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200:
 *         description: Current user object
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) =>
  controller.me(req as AuthRequest, res, next)
)

export default router
