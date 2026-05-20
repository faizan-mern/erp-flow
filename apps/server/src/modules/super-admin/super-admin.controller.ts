import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../types'
import * as service from './super-admin.service'
import { listCompaniesSchema, toggleActiveSchema } from './super-admin.validator'

export async function listCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = listCompaniesSchema.parse(req.query)
    const data = await service.listCompanies(input)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function stats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getPlatformStats()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function toggleActive(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { isActive } = toggleActiveSchema.parse(req.body)
    const data = await service.toggleActive(String(req.params.id), isActive)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
