'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, AlertTriangle, Package } from 'lucide-react'
import { fetchProducts, fetchLowStockCount, Product } from '@/lib/products'
import { useAuthStore } from '@/store/auth.store'
import { formatMoney } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'

export default function InventoryPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const canWrite = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', page, debouncedSearch, statusFilter, lowStockOnly],
    queryFn: () => fetchProducts({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      isActive: statusFilter || undefined,
      lowStockOnly: lowStockOnly ? 'true' : undefined,
    }),
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['products-low-stock-count'],
    queryFn: fetchLowStockCount,
    staleTime: 30 * 1000,
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <PageTransition>
      <PageHeader
        title="Inventory"
        subtitle={data ? `${data.total} ${lowStockOnly ? 'low-stock' : 'total'}` : ''}
        action={
          canWrite ? (
            <Link
              href="/dashboard/inventory/new"
              className="inline-flex items-center gap-2 bg-primary text-surface px-3.5 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
            >
              <Plus size={14} />
              Add Product
            </Link>
          ) : undefined
        }
      />

      {!lowStockOnly && (lowStockData?.count ?? 0) > 0 && (
        <Card className="mb-4 p-4 bg-warning-soft border-warning/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-warning" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-strong">
                  {lowStockData!.count} product{lowStockData!.count === 1 ? '' : 's'} below threshold
                </p>
                <p className="text-[12px] text-muted">
                  Restock soon to avoid stockouts.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setLowStockOnly(true); setPage(1) }}
              className="text-[12px] font-medium text-warning hover:underline shrink-0"
            >
              View low-stock items →
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {lowStockOnly && (
          <button
            onClick={() => { setLowStockOnly(false); setPage(1) }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium bg-warning-soft text-warning border border-warning/30 hover:bg-warning/15 transition-colors"
          >
            Low stock only
            <span className="text-[14px] leading-none">×</span>
          </button>
        )}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
          />
        </div>
        <div className="w-40 shrink-0">
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {isLoading && (
          <TableSkeleton headers={['SKU', 'Name', 'Stock', 'Unit Price', 'Status']} />
        )}
        {!isLoading && isError && (
          <div className="p-12 text-center text-[13px] text-danger">
            Failed to load products.
          </div>
        )}

        {data && data.products.length === 0 && (
          <EmptyState
            title={lowStockOnly ? 'No low-stock items' : 'No products yet'}
            description={
              lowStockOnly
                ? 'All products are well-stocked.'
                : 'Add your first product to start tracking inventory and stock movements.'
            }
            action={
              canWrite && !lowStockOnly ? (
                <Link
                  href="/dashboard/inventory/new"
                  className="inline-flex items-center gap-2 bg-primary text-surface px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-primary-hover transition-colors"
                >
                  <Plus size={14} />
                  Add Product
                </Link>
              ) : undefined
            }
          />
        )}

        {data && data.products.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">SKU</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Unit Price</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {data.products.map((p: Product) => {
                const isLow = p.isActive && p.quantity <= p.lowStockThreshold
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-canvas transition-colors cursor-pointer ${isLow ? 'bg-warning-soft/40' : ''}`}
                    onClick={() => router.push(`/dashboard/inventory/${p.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[12px] text-strong">{p.sku}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Package size={13} className="text-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-strong truncate">{p.name}</p>
                          {p.category && (
                            <p className="text-[11px] text-muted mt-0.5">{p.category}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isLow ? 'text-warning' : 'text-strong'}`}>
                          {p.quantity}
                        </span>
                        {isLow && (
                          <Badge variant="pending">Low</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Threshold: {p.lowStockThreshold}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-strong">{formatMoney(p.unitPrice)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={p.isActive ? 'active' : 'inactive'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:bg-canvas bg-surface"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-[13px] text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:bg-canvas bg-surface"
          >
            Next
          </button>
        </div>
      )}
    </PageTransition>
  )
}
