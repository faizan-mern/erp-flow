import { Router, RequestHandler, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './expense.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

// Multer: keep file in memory (we forward it straight to Cloudinary as a buffer).
// 10 MB cap — matches the UI copy on the submit-expense form.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// Wraps the multer middleware so its raw errors (e.g. LIMIT_FILE_SIZE) become
// friendly 400 responses instead of falling through to a 500.
function uploadInvoiceMw(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next()
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(Object.assign(new Error('File is too large. Maximum size is 10 MB.'), { status: 400 }))
    }
    return next(Object.assign(new Error('Could not read the uploaded file. Please try a different file.'), { status: 400 }))
  })
}

router.use(authenticate)

// Categories + analytics first so they don't collide with /:id
router.get('/categories', h(controller.categories))
router.get('/analytics/monthly', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.analytics))

// File upload (returns a Cloudinary URL the client puts into invoiceUrl when submitting)
router.post('/upload-invoice', uploadInvoiceMw, h(controller.uploadInvoiceFile))

// CRUD
router.get('/',       h(controller.list))
router.get('/:id',    h(controller.getOne))
router.post('/',      h(controller.create))
router.put('/:id',    h(controller.update))

// Approval workflow — managers and admins only
router.post('/:id/approve', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.approve))
router.post('/:id/reject',  requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.reject))

export default router
