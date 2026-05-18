import * as repo from './product.repository'
import {
  CreateProductInput, UpdateProductInput, ListProductsQuery, RecordMovementInput,
} from './product.validator'
import { getIO } from '../../lib/socket'

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status })
}

export async function listProducts(companyId: string, query: ListProductsQuery) {
  return repo.listProducts(companyId, query)
}

export async function getProduct(id: string, companyId: string) {
  const product = await repo.findProductById(id, companyId)
  if (!product) fail('Product not found', 404)
  return product
}

export async function getLowStockCount(companyId: string) {
  const count = await repo.countLowStock(companyId)
  return { count }
}

export async function createProduct(
  companyId: string,
  data: CreateProductInput,
  performedById: string,
) {
  const existing = await repo.findProductBySku(data.sku, companyId)
  if (existing) fail(`A product with SKU "${data.sku}" already exists`, 409)

  return repo.createProduct(companyId, data, performedById)
}

export async function updateProduct(id: string, companyId: string, data: UpdateProductInput) {
  await getProduct(id, companyId)
  return repo.updateProduct(id, companyId, data)
}

export async function deactivateProduct(id: string, companyId: string) {
  await getProduct(id, companyId)
  return repo.deactivateProduct(id, companyId)
}

export async function recordMovement(
  productId: string,
  companyId: string,
  input: RecordMovementInput,
  performedById: string,
) {
  await getProduct(productId, companyId)
  const result = await repo.recordMovement(companyId, productId, input, performedById)
  try {
    const io = getIO()
    io.to(`company:${companyId}`).emit('inventory:updated', { productId, newQuantity: result.newQuantity })
    io.to(`company:${companyId}`).emit('dashboard:refresh')
  } catch { /* socket may not be initialized in test contexts */ }
  return result
}

export async function listMovements(productId: string, companyId: string) {
  await getProduct(productId, companyId)
  return repo.listMovementsForProduct(productId, companyId)
}
