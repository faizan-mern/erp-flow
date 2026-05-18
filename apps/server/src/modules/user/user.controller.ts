import { Response, NextFunction } from 'express'
import * as service from './user.service'
import { inviteUserSchema, updateUserSchema } from './user.validator'
import { sendSuccess } from '../../utils/response'
import { logActivity } from '../../utils/activity'
import { AuthRequest } from '../../types'

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await service.listUsers(req.user.companyId)
    sendSuccess(res, users, 'Users retrieved')
  } catch (err) { next(err) }
}

export async function invite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = inviteUserSchema.parse(req.body)
    const user = await service.inviteUser(req.user.companyId, input)
    // service returns the row via findUserById after the txn — should never be null,
    // but narrow for the type system and as a defensive guard.
    if (!user) throw Object.assign(new Error('Failed to create user'), { status: 500 })
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      resourceType: 'user',
      resourceId: user.id,
      details: { email: input.email, role: input.role },
      ipAddress: req.ip,
    })
    sendSuccess(res, user, 'User invited', 201)
  } catch (err) { next(err) }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const input = updateUserSchema.parse(req.body)
    const user = await service.updateUser(id, req.user.companyId, req.user.userId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      resourceType: 'user',
      resourceId: id,
      details: input as Record<string, string | number | boolean | null>,
      ipAddress: req.ip,
    })
    sendSuccess(res, user, 'User updated')
  } catch (err) { next(err) }
}
