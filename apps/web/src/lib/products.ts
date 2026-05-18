import api from './api'

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT'

export interface Product {
  id: string
  companyId: string
  name: string
  sku: string
  description: string | null
  category: string | null
  unitPrice: string
  quantity: number
  lowStockThreshold: number
  warehouseLocation: string | null
  barcode: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { stockMovements: number }
}

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  quantity: number
  previousQuantity: number
  newQuantity: number
  reason: string | null
  createdAt: string
  performedBy: { id: string; firstName: string; lastName: string } | null
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export interface CreateProductData {
  name: string
  sku: string
  description?: string
  category?: string
  unitPrice: number
  quantity?: number
  lowStockThreshold?: number
  warehouseLocation?: string
  barcode?: string
}

export type UpdateProductData = Partial<Omit<CreateProductData, 'sku' | 'quantity'>>

export interface RecordMovementData {
  type: StockMovementType
  quantity: number
  reason?: string
}

export interface ListProductsParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  isActive?: string
  lowStockOnly?: string
}

export async function fetchProducts(params?: ListProductsParams): Promise<ProductListResponse> {
  const res = await api.get('/api/v1/products', { params })
  return res.data.data
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await api.get(`/api/v1/products/${id}`)
  return res.data.data
}

export async function fetchLowStockCount(): Promise<{ count: number }> {
  const res = await api.get('/api/v1/products/low-stock-count')
  return res.data.data
}

export async function fetchMovements(productId: string): Promise<StockMovement[]> {
  const res = await api.get(`/api/v1/products/${productId}/movements`)
  return res.data.data
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  const res = await api.post('/api/v1/products', data)
  return res.data.data
}

export async function updateProduct(id: string, data: UpdateProductData): Promise<Product> {
  const res = await api.put(`/api/v1/products/${id}`, data)
  return res.data.data
}

export async function deactivateProduct(id: string): Promise<void> {
  await api.delete(`/api/v1/products/${id}`)
}

export async function recordMovement(
  productId: string,
  data: RecordMovementData,
): Promise<{ movement: StockMovement; newQuantity: number }> {
  const res = await api.post(`/api/v1/products/${productId}/movements`, data)
  return res.data.data
}
