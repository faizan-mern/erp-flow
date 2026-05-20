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

/**
 * @openapi
 * /expenses/categories:
 *   get:
 *     tags: [Expenses]
 *     summary: List expense categories for the company
 *     responses:
 *       200:
 *         description: Array of expense categories
 */
router.get('/categories', h(controller.categories))

/**
 * @openapi
 * /expenses/analytics/monthly:
 *   get:
 *     tags: [Expenses]
 *     summary: Monthly expense totals by category (admin/manager only)
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2025 }
 *     responses:
 *       200:
 *         description: Monthly breakdown
 *       403:
 *         description: Insufficient role
 */
router.get('/analytics/monthly', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.analytics))

/**
 * @openapi
 * /expenses/upload-invoice:
 *   post:
 *     tags: [Expenses]
 *     summary: Upload an invoice file to Cloudinary
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF or image, max 10 MB
 *     responses:
 *       200:
 *         description: Cloudinary URL of the uploaded file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, format: uri }
 *       400:
 *         description: File too large or invalid format
 */
router.post('/upload-invoice', uploadInvoiceMw, h(controller.uploadInvoiceFile))

/**
 * @openapi
 * /expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses (employees see own; managers/admins see all)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated expense list
 */
router.get('/', h(controller.list))

/**
 * @openapi
 * /expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get a single expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Expense record
 *       404:
 *         description: Not found
 */
router.get('/:id', h(controller.getOne))

/**
 * @openapi
 * /expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Submit a new expense
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount, expenseDate]
 *             properties:
 *               title:       { type: string }
 *               amount:      { type: number }
 *               currency:    { type: string, default: PKR }
 *               categoryId:  { type: string, format: uuid }
 *               invoiceUrl:  { type: string, format: uri }
 *               notes:       { type: string }
 *               expenseDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Expense created with PENDING status
 */
router.post('/', h(controller.create))

/**
 * @openapi
 * /expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: Update a PENDING expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated expense
 *       403:
 *         description: Can only edit own pending expenses
 */
router.put('/:id', h(controller.update))

/**
 * @openapi
 * /expenses/{id}/approve:
 *   post:
 *     tags: [Expenses]
 *     summary: Approve an expense (admin/manager only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Expense approved
 *       403:
 *         description: Insufficient role
 */
router.post('/:id/approve', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.approve))

/**
 * @openapi
 * /expenses/{id}/reject:
 *   post:
 *     tags: [Expenses]
 *     summary: Reject an expense with a reason (admin/manager only)
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Expense rejected
 *       403:
 *         description: Insufficient role
 */
router.post('/:id/reject', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.reject))

export default router
