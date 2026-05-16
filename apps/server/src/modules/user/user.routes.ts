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

router.get('/',       h(controller.list))
router.post('/',      h(controller.invite))
router.patch('/:id',  h(controller.update))

export default router
