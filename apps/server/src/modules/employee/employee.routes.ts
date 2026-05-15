import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './employee.controller'

const router = Router()

// All employee routes require a valid JWT
router.use(authenticate)

// ─── EMPLOYEE CRUD ───────────────────────────────────────────────────────────
// Any authenticated user can view employees
router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.get('/:id/attendance', controller.getAttendance)

// Only admins and managers can create, update, or deactivate
router.post('/', requireRole('COMPANY_ADMIN', 'MANAGER'), controller.create)
router.put('/:id', requireRole('COMPANY_ADMIN', 'MANAGER'), controller.update)
router.delete('/:id', requireRole('COMPANY_ADMIN'), controller.deactivate)

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────
router.post('/attendance/checkin', controller.checkIn)
router.post('/attendance/checkout', controller.checkOut)

export default router
