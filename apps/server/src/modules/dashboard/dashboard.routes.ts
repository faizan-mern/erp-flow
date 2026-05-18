import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as controller from './dashboard.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)
router.get('/stats',    h(controller.stats))
router.get('/activity', h(controller.activity))

export default router
