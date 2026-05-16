import { Request, Response, NextFunction, RequestHandler } from 'express'
import { Role } from '@prisma/client'
import { AuthRequest } from '../types'
import { sendError } from '../utils/response'

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user
    if (!roles.includes(user.role)) {
      sendError(res, 'Insufficient permissions', 403)
      return
    }
    next()
  }
}
