import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as controller from './notification.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current user
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Array of notifications
 */
router.get('/', h(controller.list))

/**
 * @openapi
 * /notifications/mark-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark one or all notifications as read
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Omit to mark all as read
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.post('/mark-read', h(controller.markRead))

export default router
