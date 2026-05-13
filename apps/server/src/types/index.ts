import { Role } from '@prisma/client'
import { Request } from 'express'

export interface JwtPayload {
  userId: string
  companyId: string
  role: Role
  email: string
}

// Extends Express Request so req.user is typed everywhere
export interface AuthRequest extends Request {
  user: JwtPayload
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}
