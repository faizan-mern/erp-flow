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

router.get('/chats', h(controller.list))
router.post('/chats', h(controller.create))
router.get('/chats/:id', h(controller.get))
router.delete('/chats/:id', h(controller.remove))
router.post('/chats/:id/messages', aiMessageLimit, h(controller.sendMessage))

export default router
