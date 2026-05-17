import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './employee.controller'

const router = Router()

// Casting controllers to RequestHandler is required because our controllers use
// AuthRequest (a narrower type than Request). The authenticate middleware ensures
// req.user is always set before any of these handlers run.
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)

// /me must come before any role-gated routes so an EMPLOYEE can still resolve
// their own profile. The directory listing is admin/manager-only because the
// list response includes salaries across all rows. Per-id lookup is gated
// inside the controller so that an EMPLOYEE can still read their own row.
router.get('/me', h(controller.getMe))
router.get('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.list))
router.get('/:id', h(controller.getOne))
router.get('/:id/attendance', h(controller.getAttendance))

router.post('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.create))
router.put('/:id', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.update))
router.delete('/:id', requireRole('COMPANY_ADMIN'), h(controller.deactivate))

router.post('/attendance/checkin', h(controller.checkIn))
router.post('/attendance/checkout', h(controller.checkOut))

export default router
