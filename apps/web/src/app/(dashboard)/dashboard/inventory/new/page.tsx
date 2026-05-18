'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createProduct, CreateProductData } from '@/lib/products'
import { toast } from '@/store/toast.store'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

type FormState = {
  name: string
  sku: string
  category: string
  description: string
  unitPrice: string
  quantity: string
  lowStockThreshold: string
  warehouseLocation: string
  barcode: string
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  category: '',
  description: '',
  unitPrice: '',
  quantity: '0',
  lowStockThreshold: '10',
  warehouseLocation: '',
  barcode: '',
}

export default function NewProductPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  const submitMutation = useMutation({
    mutationFn: (data: CreateProductData) => createProduct(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products-low-stock-count'] })
      toast.success('Product created')
      router.push(`/dashboard/inventory/${created.id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create product.'
      setError(message)
    },
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const unitPriceNum         = Number(form.unitPrice)
    const quantityNum          = Number(form.quantity || 0)
    const lowStockThresholdNum = Number(form.lowStockThreshold || 10)

    if (Number.isNaN(unitPriceNum) || unitPriceNum < 0) {
      setError('Unit price must be a non-negative number')
      return
    }
    if (Number.isNaN(quantityNum) || quantityNum < 0) {
      setError('Quantity must be a non-negative whole number')
      return
    }

    submitMutation.mutate({
      name:              form.name,
      sku:               form.sku.trim(),
      category:          form.category || undefined,
      description:       form.description || undefined,
      unitPrice:         unitPriceNum,
      quantity:          quantityNum,
      lowStockThreshold: lowStockThresholdNum,
      warehouseLocation: form.warehouseLocation || undefined,
      barcode:           form.barcode || undefined,
    })
  }

  return (
    <PageTransition>
      <div>
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link
            href="/dashboard/inventory"
            className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors"
          >
            <ArrowLeft size={13} />
            Inventory
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">Add Product</span>
        </div>

        <PageHeader
          title="Add Product"
          subtitle="Fill in product details. Stock changes after creation go through the movements log."
        />

        <div className="flex gap-6 items-start">
          <Card className="flex-1 min-w-0 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Identity</p>
                <div className="space-y-4">
                  <Field label="Name">
                    <Input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Cotton Bedsheet King Size"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SKU" hint="Letters, numbers, dashes, underscores. Unique per company.">
                      <Input
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        placeholder="e.g. BED-KING-001"
                        required
                      />
                    </Field>
                    <Field label="Category" hint="Optional grouping for reports.">
                      <Input
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        placeholder="e.g. Textiles"
                      />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Optional product details"
                      className="w-full px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong resize-none"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-divider" />

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Pricing & Stock</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Unit Price (PKR)">
                    <Input
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unitPrice}
                      onChange={handleChange}
                      placeholder="e.g. 4500"
                      required
                    />
                  </Field>
                  <Field label="Initial Stock" hint="Logged as the first IN movement.">
                    <Input
                      name="quantity"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field label="Low-Stock Threshold" hint="Flagged when stock drops to this level.">
                    <Input
                      name="lowStockThreshold"
                      type="number"
                      min="0"
                      value={form.lowStockThreshold}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field label="Warehouse Location">
                    <Input
                      name="warehouseLocation"
                      value={form.warehouseLocation}
                      onChange={handleChange}
                      placeholder="e.g. Aisle 4, Shelf B"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-divider" />

              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Identifiers</p>
                <Field label="Barcode" hint="Optional. Scannable code for warehouse handling.">
                  <Input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="e.g. 8964001234567"
                  />
                </Field>
              </div>

              {error && (
                <p className="text-[13px] text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Creating...' : 'Create Product'}
                </Button>
                <Link
                  href="/dashboard/inventory"
                  className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium text-muted border border-border hover:bg-canvas transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </Card>

          <div className="w-72 shrink-0">
            <Card className="p-5">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Required fields</p>
              <div className="space-y-2">
                {['Name', 'SKU', 'Unit Price'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-strong">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="border-t border-divider mt-4 pt-4">
                <p className="text-[12px] text-muted leading-relaxed">
                  All other fields are optional. Stock changes after creation must go through <span className="font-medium text-strong">Record Movement</span> to keep the audit log accurate.
                </p>
              </div>
            </Card>

            <Card className="p-5 mt-3">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">SKU rules</p>
              <p className="text-[12px] text-muted leading-relaxed">
                SKU is <span className="font-medium text-strong">permanent</span> after creation — changing it would invalidate printed labels and barcode scans. Choose carefully.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
