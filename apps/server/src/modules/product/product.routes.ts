import { Router, RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/role.middleware'
import * as controller from './product.controller'

const router = Router()
const h = (fn: Function) => fn as RequestHandler

router.use(authenticate)

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List all products with optional search and filters
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated product list
 */
router.get('/', h(controller.list))

/**
 * @openapi
 * /products/low-stock-count:
 *   get:
 *     tags: [Products]
 *     summary: Count products at or below their low-stock threshold
 *     responses:
 *       200:
 *         description: Count of low-stock items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 */
router.get('/low-stock-count', h(controller.lowStockCount))

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product record
 *       404:
 *         description: Not found
 */
router.get('/:id', h(controller.getOne))

/**
 * @openapi
 * /products/{id}/movements:
 *   get:
 *     tags: [Products]
 *     summary: List stock movements for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated movement history
 */
router.get('/:id/movements', h(controller.listMovements))

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product (admin/manager only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, unitPrice]
 *             properties:
 *               name:              { type: string }
 *               sku:               { type: string }
 *               description:       { type: string }
 *               category:          { type: string }
 *               unitPrice:         { type: number }
 *               quantity:          { type: integer, default: 0 }
 *               lowStockThreshold: { type: integer, default: 10 }
 *               warehouseLocation: { type: string }
 *               barcode:           { type: string }
 *     responses:
 *       201:
 *         description: Product created
 *       409:
 *         description: SKU already exists in this company
 */
router.post('/', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.create))

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product (admin/manager only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated product
 */
router.put('/:id', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.update))

/**
 * @openapi
 * /products/{id}/movements:
 *   post:
 *     tags: [Products]
 *     summary: Record a stock movement (IN, OUT, or ADJUSTMENT)
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
 *             required: [type, quantity]
 *             properties:
 *               type:     { type: string, enum: [IN, OUT, ADJUSTMENT] }
 *               quantity: { type: integer }
 *               reason:   { type: string }
 *     responses:
 *       200:
 *         description: Movement recorded; product quantity updated
 *       400:
 *         description: Insufficient stock for OUT movement
 */
router.post('/:id/movements', requireRole('COMPANY_ADMIN', 'MANAGER'), h(controller.recordMovement))

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Deactivate a product (soft delete, admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product deactivated
 */
router.delete('/:id', requireRole('COMPANY_ADMIN'), h(controller.deactivate))

export default router
