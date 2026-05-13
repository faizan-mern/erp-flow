import { Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { AuthRequest } from '../types'
import { sendError } from '../utils/response'

// Usage: router.delete('/users/:id', authenticate, requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), controller)
export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403)
      return
    }
    next()
  }
}
