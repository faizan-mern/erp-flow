import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as controller from './notification.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)
router.get('/',           h(controller.list))
router.post('/mark-read', h(controller.markRead))

export default router
