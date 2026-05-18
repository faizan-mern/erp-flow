'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Scale } from 'lucide-react'
import {
  fetchProduct, fetchMovements, updateProduct, recordMovement, deactivateProduct,
  StockMovement, StockMovementType, UpdateProductData, RecordMovementData,
} from '@/lib/products'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { formatMoney, formatDate, formatTime } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

type Tab = 'details' | 'movements'

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  IN:         'Stock In',
  OUT:        'Stock Out',
  ADJUSTMENT: 'Adjustment',
}

const MOVEMENT_VARIANT: Record<StockMovementType, 'approved' | 'rejected' | 'pending'> = {
  IN:         'approved',  // green — stock arrived
  OUT:        'rejected',  // red   — stock left
  ADJUSTMENT: 'pending',   // amber — recount
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const canEdit = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER'

  const [tab, setTab] = useState<Tab>('details')
  const [overrides, setOverrides] = useState<Partial<UpdateProductData>>({})
  const [error, setError] = useState('')

  // Movement form local state — only rendered when canEdit + product is active
  const [movement, setMovement] = useState<{ type: StockMovementType; quantity: string; reason: string }>({
    type: 'IN',
    quantity: '',
    reason: '',
  })
  const [movementError, setMovementError] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  })

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['movements', id],
    queryFn: () => fetchMovements(id),
    enabled: tab === 'movements',
  })

  const form = {
    name:              overrides.name              ?? product?.name              ?? '',
    category:          overrides.category          ?? product?.category          ?? '',
    description:       overrides.description       ?? product?.description       ?? '',
    unitPrice:         overrides.unitPrice         ?? (product ? Number(product.unitPrice) : 0),
    lowStockThreshold: overrides.lowStockThreshold ?? product?.lowStockThreshold ?? 10,
    warehouseLocation: overrides.warehouseLocation ?? product?.warehouseLocation ?? '',
    barcode:           overrides.barcode           ?? product?.barcode           ?? '',
  }

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductData) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      setOverrides({})
      toast.success('Product updated')
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save changes.'
      setError(message)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock-count'] })
      setConfirmDeactivate(false)
      toast.success('Product deactivated')
    },
    onError: () => toast.error('Failed to deactivate product'),
  })

  const movementMutation = useMutation({
    mutationFn: (data: RecordMovementData) => recordMovement(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      queryClient.invalidateQueries({ queryKey: ['movements', id] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock-count'] })
      setMovement({ type: 'IN', quantity: '', reason: '' })
      setMovementError('')
      toast.success(`Stock updated — new quantity: ${result.newQuantity}`)
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to record movement.'
      setMovementError(message)
    },
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    if (name === 'unitPrice' || name === 'lowStockThreshold') {
      setOverrides((prev) => ({ ...prev, [name]: value === '' ? undefined : Number(value) }))
    } else {
      setOverrides((prev) => ({ ...prev, [name]: value }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    updateMutation.mutate({
      name:              form.name,
      category:          form.category || undefined,
      description:       form.description || undefined,
      unitPrice:         Number(form.unitPrice),
      lowStockThreshold: Number(form.lowStockThreshold),
      warehouseLocation: form.warehouseLocation || undefined,
      barcode:           form.barcode || undefined,
    })
  }

  function handleMovementSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMovementError('')
    const qty = Number(movement.quantity)
    if (Number.isNaN(qty) || qty < 0) {
      setMovementError('Quantity must be a non-negative whole number')
      return
    }
    if (movement.type !== 'ADJUSTMENT' && qty === 0) {
      setMovementError('Quantity must be greater than zero for IN/OUT')
      return
    }
    movementMutation.mutate({
      type:     movement.type,
      quantity: qty,
      reason:   movement.reason || undefined,
    })
  }

  if (isLoading) {
    return <div className="p-10 text-center text-[13px] text-muted">Loading product...</div>
  }

  if (!product) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px] font-medium text-strong mb-2">Product not found</p>
        <Link href="/dashboard/inventory" className="text-primary text-[13px] hover:underline">Back to inventory</Link>
      </div>
    )
  }

  const isLow = product.isActive && product.quantity <= product.lowStockThreshold

  return (
    <PageTransition>
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link href="/dashboard/inventory" className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors">
            <ArrowLeft size={13} />
            Inventory
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">{product.name}</span>
        </div>

        {/* Profile card */}
        <Card className="px-5 py-4 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-strong">{product.name}</p>
              <p className="text-[12px] text-muted mt-0.5 font-mono">{product.sku}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-[11px] text-muted uppercase tracking-wider">Stock</p>
                <p className={`text-[18px] font-semibold ${isLow ? 'text-warning' : 'text-strong'}`}>
                  {product.quantity}
                  {isLow && (
                    <span className="ml-2 align-middle">
                      <Badge variant="pending">Low</Badge>
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={product.isActive ? 'active' : 'inactive'}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {canEdit && product.isActive && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDeactivate) {
                      deactivateMutation.mutate()
                    } else {
                      setConfirmDeactivate(true)
                    }
                  }}
                  onBlur={() => setConfirmDeactivate(false)}
                  disabled={deactivateMutation.isPending}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 ${
                    confirmDeactivate
                      ? 'bg-danger-soft text-danger border border-danger/20'
                      : 'border border-border text-muted hover:text-danger hover:border-danger/40'
                  }`}
                >
                  {deactivateMutation.isPending
                    ? 'Deactivating…'
                    : confirmDeactivate
                    ? 'Confirm deactivate?'
                    : 'Deactivate'}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border">
          {([
            { id: 'details' as Tab,    label: 'Details' },
            { id: 'movements' as Tab,  label: `Stock Movements${product._count ? ` (${product._count.stockMovements})` : ''}` },
          ]).map(({ id: tid, label }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                tab === tid
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div className="flex gap-6 items-start flex-wrap">
            <div className="flex-1 min-w-[320px]">
              <Card className="p-6">
                {canEdit ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Identity</p>
                      <Field label="Name">
                        <Input name="name" value={form.name} onChange={handleChange} required />
                      </Field>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Field label="SKU" hint="SKU is immutable after creation.">
                          <Input value={product.sku} disabled className="font-mono opacity-60 cursor-not-allowed" />
                        </Field>
                        <Field label="Category">
                          <Input name="category" value={form.category} onChange={handleChange} />
                        </Field>
                      </div>
                      <div className="mt-4">
                        <Field label="Description">
                          <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong resize-none"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="border-t border-divider" />

                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Pricing & Threshold</p>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Unit Price (PKR)">
                          <Input name="unitPrice" type="number" step="0.01" min="0" value={form.unitPrice} onChange={handleChange} required />
                        </Field>
                        <Field label="Low-Stock Threshold">
                          <Input name="lowStockThreshold" type="number" min="0" value={form.lowStockThreshold} onChange={handleChange} />
                        </Field>
                        <Field label="Warehouse Location">
                          <Input name="warehouseLocation" value={form.warehouseLocation} onChange={handleChange} />
                        </Field>
                        <Field label="Barcode">
                          <Input name="barcode" value={form.barcode} onChange={handleChange} />
                        </Field>
                      </div>
                    </div>

                    {error && <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex gap-3 pt-1">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                      </Button>
                      <Link href="/dashboard/inventory" className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors">
                        Cancel
                      </Link>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <Detail label="Name" value={product.name} />
                    <Detail label="SKU" value={product.sku} mono />
                    <Detail label="Category" value={product.category ?? '—'} />
                    <Detail label="Unit Price" value={formatMoney(product.unitPrice)} />
                    <Detail label="Stock Quantity" value={String(product.quantity)} />
                    <Detail label="Low-Stock Threshold" value={String(product.lowStockThreshold)} />
                    <Detail label="Warehouse Location" value={product.warehouseLocation ?? '—'} />
                    <Detail label="Barcode" value={product.barcode ?? '—'} />
                    <Detail label="Description" value={product.description ?? '—'} />
                  </div>
                )}
              </Card>
            </div>

            {canEdit && product.isActive && (
              <div className="w-80 shrink-0">
                <Card className="p-5">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Record Movement</p>
                  <p className="text-[12px] text-muted mb-4 leading-relaxed">
                    Every stock change goes through this form so the ledger stays in sync with the cached quantity.
                  </p>

                  <form onSubmit={handleMovementSubmit} className="space-y-3">
                    <Field label="Type">
                      <Select
                        name="type"
                        value={movement.type}
                        onChange={(e) => setMovement((p) => ({ ...p, type: e.target.value as StockMovementType }))}
                      >
                        <option value="IN">IN — stock received</option>
                        <option value="OUT">OUT — stock removed/shipped</option>
                        <option value="ADJUSTMENT">ADJUSTMENT — set to absolute total</option>
                      </Select>
                    </Field>

                    <Field
                      label="Quantity"
                      hint={
                        movement.type === 'ADJUSTMENT'
                          ? 'New total stock count.'
                          : `Units to ${movement.type === 'IN' ? 'add' : 'remove'}.`
                      }
                    >
                      <Input
                        type="number"
                        min="0"
                        value={movement.quantity}
                        onChange={(e) => setMovement((p) => ({ ...p, quantity: e.target.value }))}
                        placeholder="e.g. 10"
                        required
                      />
                    </Field>

                    <Field label="Reason" hint="Optional but recommended for adjustments.">
                      <textarea
                        value={movement.reason}
                        onChange={(e) => setMovement((p) => ({ ...p, reason: e.target.value }))}
                        rows={2}
                        placeholder="e.g. Damaged in transit"
                        className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong resize-none"
                      />
                    </Field>

                    {movementError && (
                      <p className="text-[12px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-2.5 py-1.5">
                        {movementError}
                      </p>
                    )}

                    <Button type="submit" disabled={movementMutation.isPending} className="w-full">
                      {movementMutation.isPending ? 'Recording...' : 'Record'}
                    </Button>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === 'movements' && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Movement History</p>
            </div>

            {loadingMovements && (
              <div className="p-8 text-center text-[13px] text-muted">Loading...</div>
            )}

            {!loadingMovements && movements.length === 0 && (
              <div className="p-8 text-center text-[13px] text-muted">No stock movements recorded yet.</div>
            )}

            {!loadingMovements && movements.length > 0 && (
              <table className="w-full text-[13px]">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">When</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Change</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">By</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {movements.map((m: StockMovement) => (
                    <tr key={m.id} className="hover:bg-canvas">
                      <td className="px-5 py-3 text-strong">
                        <div>{formatDate(m.createdAt)}</div>
                        <div className="text-[11px] text-muted">{formatTime(m.createdAt)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={MOVEMENT_VARIANT[m.type]}>
                          <span className="inline-flex items-center gap-1">
                            {m.type === 'IN'   && <ArrowDownToLine size={11} />}
                            {m.type === 'OUT'  && <ArrowUpFromLine size={11} />}
                            {m.type === 'ADJUSTMENT' && <Scale size={11} />}
                            {MOVEMENT_LABEL[m.type]}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-strong">
                        <span className="text-muted">{m.previousQuantity}</span>
                        <span className="mx-1.5 text-muted">→</span>
                        <span className="font-medium">{m.newQuantity}</span>
                        <span className="text-[11px] text-muted ml-1.5">
                          ({m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : '='}{m.quantity})
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-muted">{m.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </PageTransition>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className={`text-[13px] text-strong ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

