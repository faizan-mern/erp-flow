import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './dashboard.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)
router.get('/stats',    requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.stats))
router.get('/activity', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.activity))

export default router
