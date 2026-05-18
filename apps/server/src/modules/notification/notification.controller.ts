import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../types'
import { sendSuccess } from '../../utils/response'
import * as repo from './notification.repository'

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      repo.listForUser(req.user.userId, req.user.companyId),
      repo.countUnread(req.user.userId, req.user.companyId),
    ])
    sendSuccess(res, { notifications, unreadCount }, 'Notifications retrieved')
  } catch (err) { next(err) }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await repo.markAllRead(req.user.userId, req.user.companyId)
    sendSuccess(res, null, 'Notifications marked as read')
  } catch (err) { next(err) }
}
