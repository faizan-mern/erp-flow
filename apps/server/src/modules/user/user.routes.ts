import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './user.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

// Every route in this module requires COMPANY_ADMIN — user management is
// the most privileged surface in the app. No exceptions.
router.use(authenticate)
router.use(requireRole('COMPANY_ADMIN'))

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users in the company (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Admin only
 */
router.get('/', h(controller.list))

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Invite (create) a new user in the company (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, role]
 *             properties:
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 8 }
 *               role:      { type: string, enum: [COMPANY_ADMIN, MANAGER, EMPLOYEE] }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already exists in this company
 */
router.post('/', h(controller.invite))

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role or details (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:      { type: string, enum: [COMPANY_ADMIN, MANAGER, EMPLOYEE] }
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin only
 */
router.patch('/:id', h(controller.update))

export default router
