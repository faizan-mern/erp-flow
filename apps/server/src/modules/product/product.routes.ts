import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './product.controller'

const router = Router()

const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)

router.get('/',                h(controller.list))
router.get('/low-stock-count', h(controller.lowStockCount))
router.get('/:id',             h(controller.getOne))
router.get('/:id/movements',   h(controller.listMovements))

router.post('/',               requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.create))
router.put('/:id',             requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.update))
router.post('/:id/movements',  requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.recordMovement))

router.delete('/:id',          requireRole('COMPANY_ADMIN'),            h(controller.deactivate))

export default router
