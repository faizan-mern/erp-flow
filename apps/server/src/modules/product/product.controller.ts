import { Response, NextFunction } from 'express'
import * as service from './product.service'
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  recordMovementSchema,
} from './product.validator'
import { sendSuccess } from '../../utils/response'
import { logActivity } from '../../utils/activity'
import { AuthRequest } from '../../types'

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = listProductsQuerySchema.parse(req.query)
    const result = await service.listProducts(req.user.companyId, query)
    sendSuccess(res, result, 'Products retrieved')
  } catch (err) { next(err) }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const product = await service.getProduct(req.params['id'] as string, req.user.companyId)
    sendSuccess(res, product, 'Product retrieved')
  } catch (err) { next(err) }
}

export async function lowStockCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await service.getLowStockCount(req.user.companyId)
    sendSuccess(res, data, 'Low stock count')
  } catch (err) { next(err) }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body)
    const product = await service.createProduct(req.user.companyId, input, req.user.userId)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      resourceType: 'product',
      resourceId: product.id,
      details: { name: input.name, sku: input.sku, initialQuantity: input.quantity },
    })
    sendSuccess(res, product, 'Product created', 201)
  } catch (err) { next(err) }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    const input = updateProductSchema.parse(req.body)
    const product = await service.updateProduct(id, req.user.companyId, input)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'UPDATE',
      resourceType: 'product',
      resourceId: id,
      details: input as Record<string, string | number | boolean | null>,
    })
    sendSuccess(res, product, 'Product updated')
  } catch (err) { next(err) }
}

export async function deactivate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params['id'] as string
    await service.deactivateProduct(id, req.user.companyId)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'DELETE',
      resourceType: 'product',
      resourceId: id,
    })
    sendSuccess(res, null, 'Product deactivated')
  } catch (err) { next(err) }
}

export async function recordMovement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = req.params['id'] as string
    const input = recordMovementSchema.parse(req.body)
    const result = await service.recordMovement(productId, req.user.companyId, input, req.user.userId)
    logActivity({
      companyId: req.user.companyId,
      userId: req.user.userId,
      action: 'CREATE',
      resourceType: 'stock_movement',
      resourceId: result.movement.id,
      details: {
        productId,
        type: input.type,
        quantity: input.quantity,
        newQuantity: result.newQuantity,
        reason: input.reason ?? null,
      },
    })
    sendSuccess(res, result, 'Stock movement recorded', 201)
  } catch (err) { next(err) }
}

export async function listMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = req.params['id'] as string
    const movements = await service.listMovements(productId, req.user.companyId)
    sendSuccess(res, movements, 'Movements retrieved')
  } catch (err) { next(err) }
}
