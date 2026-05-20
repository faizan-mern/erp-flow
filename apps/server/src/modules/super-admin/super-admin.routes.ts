import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './super-admin.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)
router.use(requireRole('SUPER_ADMIN'))

/**
 * @openapi
 * /super-admin/companies:
 *   get:
 *     tags: [Super Admin]
 *     summary: List all tenant companies on the platform (super admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of companies with user/employee/expense counts
 *       403:
 *         description: Super admin only
 */
router.get('/companies', h(controller.listCompanies))

/**
 * @openapi
 * /super-admin/stats:
 *   get:
 *     tags: [Super Admin]
 *     summary: Platform-wide aggregate statistics (super admin only)
 *     responses:
 *       200:
 *         description: Totals across all tenants
 */
router.get('/stats', h(controller.stats))

/**
 * @openapi
 * /super-admin/companies/{id}/toggle:
 *   patch:
 *     tags: [Super Admin]
 *     summary: Suspend or activate a company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated company
 *       404:
 *         description: Company not found
 */
router.patch('/companies/:id/toggle', h(controller.toggleActive))

export default router
