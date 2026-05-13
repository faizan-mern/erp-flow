import { Router } from 'express'
import * as controller from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../../types'

const router = Router()

router.post('/register', controller.register)
router.post('/login', controller.login)
router.post('/refresh', controller.refresh)
router.post('/logout', controller.logout)
router.get('/verify-email/:token', controller.verifyEmail)
router.post('/forgot-password', controller.forgotPassword)
router.post('/reset-password', controller.resetPassword)
router.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) =>
  controller.me(req as AuthRequest, res, next)
)

export default router
