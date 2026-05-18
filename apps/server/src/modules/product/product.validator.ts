import { z } from 'zod'

const skuRegex = /^[A-Za-z0-9_-]+$/

export const createProductSchema = z.object({
  name:              z.string().min(1, 'Name is required').max(200),
  sku:               z.string().min(1, 'SKU is required').max(64).regex(skuRegex, 'SKU may only contain letters, numbers, dashes, underscores'),
  description:       z.string().max(1000).optional(),
  category:          z.string().max(100).optional(),
  unitPrice:         z.number().nonnegative('Unit price cannot be negative'),
  quantity:          z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  warehouseLocation: z.string().max(100).optional(),
  barcode:           z.string().max(64).optional(),
})

// quantity is omitted because stock only changes via recordMovement (audit trail).
// sku is omitted because changing it would invalidate every printed label and barcode scan.
export const updateProductSchema = createProductSchema
  .omit({ quantity: true, sku: true })
  .partial()

export const listProductsQuerySchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  search:       z.string().optional(),
  category:     z.string().optional(),
  isActive:     z.enum(['true', 'false']).optional(),
  lowStockOnly: z.enum(['true', 'false']).optional(),
})

export const recordMovementSchema = z.object({
  type:     z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
  reason:   z.string().max(500).optional(),
})

export type CreateProductInput     = z.infer<typeof createProductSchema>
export type UpdateProductInput     = z.infer<typeof updateProductSchema>
export type ListProductsQuery      = z.infer<typeof listProductsQuerySchema>
export type RecordMovementInput    = z.infer<typeof recordMovementSchema>
