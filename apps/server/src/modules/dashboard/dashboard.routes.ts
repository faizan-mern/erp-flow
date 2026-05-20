import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './dashboard.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get company-wide KPI stats (admin/manager only)
 *     description: Returns total employees, pending expenses, low-stock count, and recent notifications.
 *     responses:
 *       200:
 *         description: KPI summary object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:    { type: integer }
 *                 pendingExpenses:   { type: integer }
 *                 lowStockProducts:  { type: integer }
 *                 totalExpenseAmount:{ type: number }
 *       403:
 *         description: Insufficient role
 */
router.get('/stats', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.stats))

/**
 * @openapi
 * /dashboard/activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent activity log for the company (admin/manager only)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Array of activity log entries
 *       403:
 *         description: Insufficient role
 */
router.get('/activity', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.activity))

export default router
