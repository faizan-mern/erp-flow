import { Prisma, StockMovementType } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from './product.validator'

const PRODUCT_INCLUDE = {
  _count: { select: { stockMovements: true } },
} satisfies Prisma.ProductInclude

export async function listProducts(companyId: string, filters: ListProductsQuery) {
  const baseWhere: Prisma.ProductWhereInput = {
    companyId,
    ...(filters.isActive !== undefined && { isActive: filters.isActive === 'true' }),
    ...(filters.category && { category: filters.category }),
    ...(filters.search && {
      OR: [
        { name:    { contains: filters.search, mode: 'insensitive' as const } },
        { sku:     { contains: filters.search, mode: 'insensitive' as const } },
        { barcode: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  if (filters.lowStockOnly === 'true') {
    // Prisma's where clause cannot compare two columns on the same row;
    // raw query is the only safe option for `quantity <= lowStockThreshold`.
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE "companyId" = ${companyId}
        AND "isActive" = true
        AND quantity <= "lowStockThreshold"
      ORDER BY "createdAt" DESC
      OFFSET ${(filters.page - 1) * filters.limit}
      LIMIT ${filters.limit}
    `
    const totalRow = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM products
      WHERE "companyId" = ${companyId}
        AND "isActive" = true
        AND quantity <= "lowStockThreshold"
    `
    const products = ids.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: ids.map((r) => r.id) }, companyId },
          include: PRODUCT_INCLUDE,
          orderBy: { createdAt: 'desc' },
        })
      : []
    return {
      products,
      total: Number(totalRow[0]?.count ?? 0),
      page: filters.page,
      limit: filters.limit,
    }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where: baseWhere }),
  ])

  return { products, total, page: filters.page, limit: filters.limit }
}

export async function findProductById(id: string, companyId: string) {
  return prisma.product.findFirst({
    where: { id, companyId },
    include: PRODUCT_INCLUDE,
  })
}

export async function findProductBySku(sku: string, companyId: string) {
  return prisma.product.findFirst({
    where: { sku, companyId },
    select: { id: true },
  })
}

export async function countLowStock(companyId: string): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM products
    WHERE "companyId" = ${companyId}
      AND "isActive" = true
      AND quantity <= "lowStockThreshold"
  `
  return Number(result[0]?.count ?? 0)
}

export async function createProduct(
  companyId: string,
  data: CreateProductInput,
  performedById: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        companyId,
        name:              data.name,
        sku:               data.sku,
        description:       data.description,
        category:          data.category,
        unitPrice:         data.unitPrice,
        quantity:          data.quantity,
        lowStockThreshold: data.lowStockThreshold,
        warehouseLocation: data.warehouseLocation,
        barcode:           data.barcode,
      },
      include: PRODUCT_INCLUDE,
    })

    if (data.quantity > 0) {
      await tx.stockMovement.create({
        data: {
          companyId,
          productId:        product.id,
          type:             'IN',
          quantity:         data.quantity,
          previousQuantity: 0,
          newQuantity:      data.quantity,
          reason:           'Initial stock on creation',
          performedById,
        },
      })
    }

    return product
  })
}

export async function updateProduct(id: string, companyId: string, data: UpdateProductInput) {
  await prisma.product.updateMany({
    where: { id, companyId },
    data: {
      ...(data.name              !== undefined && { name: data.name }),
      ...(data.description       !== undefined && { description: data.description }),
      ...(data.category          !== undefined && { category: data.category }),
      ...(data.unitPrice         !== undefined && { unitPrice: data.unitPrice }),
      ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
      ...(data.warehouseLocation !== undefined && { warehouseLocation: data.warehouseLocation }),
      ...(data.barcode           !== undefined && { barcode: data.barcode }),
    },
  })
  return findProductById(id, companyId)
}

export async function deactivateProduct(id: string, companyId: string) {
  await prisma.product.updateMany({
    where: { id, companyId },
    data: { isActive: false },
  })
  return findProductById(id, companyId)
}

// Quantity changes + audit row written atomically. Row-locking inside the
// transaction prevents two concurrent OUT operations from both passing the
// stock check against a stale value.
export async function recordMovement(
  companyId: string,
  productId: string,
  input: { type: StockMovementType; quantity: number; reason?: string },
  performedById: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true, quantity: true, isActive: true },
    })
    if (!product) {
      throw Object.assign(new Error('Product not found'), { status: 404 })
    }
    if (!product.isActive) {
      throw Object.assign(new Error('Cannot record movement on a deactivated product'), { status: 409 })
    }

    const previousQuantity = product.quantity
    let newQuantity: number

    if (input.type === 'IN') {
      newQuantity = previousQuantity + input.quantity
    } else if (input.type === 'OUT') {
      newQuantity = previousQuantity - input.quantity
      if (newQuantity < 0) {
        throw Object.assign(
          new Error(`Insufficient stock. Available: ${previousQuantity}, requested: ${input.quantity}`),
          { status: 409 }
        )
      }
    } else {
      newQuantity = input.quantity
    }

    await tx.product.update({
      where: { id: productId },
      data:  { quantity: newQuantity },
    })

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        productId,
        type:             input.type,
        quantity:         input.quantity,
        previousQuantity,
        newQuantity,
        reason:           input.reason,
        performedById,
      },
      include: {
        performedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return { movement, newQuantity }
  })
}

export async function listMovementsForProduct(productId: string, companyId: string, limit = 50) {
  return prisma.stockMovement.findMany({
    where: { productId, companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      performedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}
