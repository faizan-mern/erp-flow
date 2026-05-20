import { Router, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.middleware'
import * as controller from './ai.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

const aiMessageLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: { success: false, message: 'Too many AI requests. Please wait a few minutes before sending more.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authenticate)

/**
 * @openapi
 * /ai/chats:
 *   get:
 *     tags: [AI]
 *     summary: List all AI chat sessions for the current user
 *     responses:
 *       200:
 *         description: Array of chat sessions (title + timestamps, no messages)
 */
router.get('/chats', h(controller.list))

/**
 * @openapi
 * /ai/chats:
 *   post:
 *     tags: [AI]
 *     summary: Create a new AI chat session
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, default: 'New Chat' }
 *     responses:
 *       201:
 *         description: New chat session created
 */
router.post('/chats', h(controller.create))

/**
 * @openapi
 * /ai/chats/{id}:
 *   get:
 *     tags: [AI]
 *     summary: Get a chat session with its full message history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chat with messages array
 *       404:
 *         description: Chat not found
 */
router.get('/chats/:id', h(controller.get))

/**
 * @openapi
 * /ai/chats/{id}:
 *   delete:
 *     tags: [AI]
 *     summary: Delete a chat session and all its messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chat deleted
 */
router.delete('/chats/:id', h(controller.remove))

/**
 * @openapi
 * /ai/chats/{id}/messages:
 *   post:
 *     tags: [AI]
 *     summary: Send a message and get an AI response (rate limited to 20/10min in production)
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
 *             required: [content]
 *             properties:
 *               content: { type: string, example: What are my top expenses this month? }
 *     responses:
 *       200:
 *         description: AI assistant reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/chats/:id/messages', aiMessageLimit, h(controller.sendMessage))

export default router
