import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { sendError } from '../utils/response'
import { AuthRequest } from '../types'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401)
    return
  }

  const token = header.split(' ')[1]
  try {
    const payload = verifyAccessToken(token)
    ;(req as AuthRequest).user = payload
    next()
  } catch {
    sendError(res, 'Invalid or expired token', 401)
  }
}
