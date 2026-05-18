import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../types'
import { sendSuccess } from '../../utils/response'
import * as service from './dashboard.service'

export async function stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getStats(req.user.companyId)
    sendSuccess(res, data, 'Dashboard stats')
  } catch (err) { next(err) }
}

export async function activity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getActivity(req.user.companyId)
    sendSuccess(res, { items: data }, 'Recent activity')
  } catch (err) { next(err) }
}
