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

/**
 * @openapi
 * /employees/me:
 *   get:
 *     tags: [Employees]
 *     summary: Get the employee profile for the current user
 *     responses:
 *       200:
 *         description: Employee profile
 *       404:
 *         description: No employee record linked to this user
 */
router.get('/me', h(controller.getMe))

/**
 * @openapi
 * /employees:
 *   get:
 *     tags: [Employees]
 *     summary: List all employees in the company (admin/manager only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated employee list
 *       403:
 *         description: Insufficient role
 */
router.get('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.list))

/**
 * @openapi
 * /employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get a single employee by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Employee record
 *       403:
 *         description: Employees can only read their own record
 *       404:
 *         description: Not found
 */
router.get('/:id', h(controller.getOne))

/**
 * @openapi
 * /employees/{id}/attendance:
 *   get:
 *     tags: [Employees]
 *     summary: Get attendance records for an employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: month
 *         schema: { type: string, example: '2025-05' }
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get('/:id/attendance', h(controller.getAttendance))

/**
 * @openapi
 * /employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create a new employee (admin/manager only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName]
 *             properties:
 *               firstName:  { type: string }
 *               lastName:   { type: string }
 *               department: { type: string }
 *               position:   { type: string }
 *               salary:     { type: number }
 *               phone:      { type: string }
 *               hireDate:   { type: string, format: date }
 *     responses:
 *       201:
 *         description: Employee created
 *       403:
 *         description: Insufficient role
 */
router.post('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.create))

/**
 * @openapi
 * /employees/{id}:
 *   put:
 *     tags: [Employees]
 *     summary: Update an employee (admin/manager only)
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
 *               firstName:  { type: string }
 *               lastName:   { type: string }
 *               department: { type: string }
 *               position:   { type: string }
 *               salary:     { type: number }
 *     responses:
 *       200:
 *         description: Updated employee
 *       403:
 *         description: Insufficient role
 *       404:
 *         description: Not found
 */
router.put('/:id', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.update))

/**
 * @openapi
 * /employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Deactivate an employee (soft delete, admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Employee deactivated
 *       403:
 *         description: Insufficient role
 */
router.delete('/:id', requireRole('COMPANY_ADMIN'), h(controller.deactivate))

/**
 * @openapi
 * /employees/attendance/checkin:
 *   post:
 *     tags: [Employees]
 *     summary: Clock in for today
 *     responses:
 *       200:
 *         description: Check-in recorded
 *       400:
 *         description: Already checked in today
 */
router.post('/attendance/checkin', h(controller.checkIn))

/**
 * @openapi
 * /employees/attendance/checkout:
 *   post:
 *     tags: [Employees]
 *     summary: Clock out for today
 *     responses:
 *       200:
 *         description: Check-out recorded
 *       400:
 *         description: No active check-in found
 */
router.post('/attendance/checkout', h(controller.checkOut))

export default router
