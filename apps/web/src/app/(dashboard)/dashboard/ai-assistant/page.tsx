'use client'

import { Sparkles } from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

export default function AiAssistantPlaceholderPage() {
  return (
    <PageTransition>
      <div>
        <PageHeader
          title="AI Assistant"
          subtitle="Ask natural-language questions about your company data."
        />

        <Card className="p-12 text-center">
          <div className="w-12 h-12 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={20} className="text-primary" />
          </div>
          <p className="text-[15px] font-semibold text-strong mb-1">Coming soon</p>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            The AI Assistant uses OpenRouter with live multi-tenant data access via
            whitelisted repository tools. Wiring up after the Inventory module ships.
          </p>
        </Card>
      </div>
    </PageTransition>
  )
}
