'use client'

import { Package } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

export default function InventoryPlaceholderPage() {
  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Inventory"
          subtitle="Track products, stock levels and movement history."
        />

        <Card className="p-12 text-center">
          <div className="w-12 h-12 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={20} className="text-primary" />
          </div>
          <p className="text-[15px] font-semibold text-strong mb-1">Coming soon</p>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            The Inventory module is in active development. It will include product CRUD,
            low-stock alerts and an immutable stock-movement log.
          </p>
        </Card>
      </div>
    </PageTransition>
  )
}
