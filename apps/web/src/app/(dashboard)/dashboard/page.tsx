'use client'

import { useAuthStore } from '@/store/auth.store'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { Users, Receipt, Package, Sparkles } from 'lucide-react'

const STATS = [
  {
    label: 'Total Employees',
    value: '—',
    icon: Users,
    color: 'text-primary',
    bg: 'bg-primary-soft',
    note: 'Add employees to see count',
  },
  {
    label: 'Pending Expenses',
    value: '—',
    icon: Receipt,
    color: 'text-warning',
    bg: 'bg-warning-soft',
    note: 'Awaiting approval',
  },
  {
    label: 'Low Stock Items',
    value: '—',
    icon: Package,
    color: 'text-danger',
    bg: 'bg-danger-soft',
    note: 'Below threshold',
  },
  {
    label: 'AI Chats',
    value: '—',
    icon: Sparkles,
    color: 'text-ai',
    bg: 'bg-ai-soft',
    note: 'This week',
  },
]

export default function DashboardPage() {
  const { user } = useAuthStore()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <PageTransition>
      <div className="mb-7">
        <h2 className="text-[22px] font-semibold text-strong">
          {greeting}, {user?.firstName}
        </h2>
        <p className="text-[13px] text-muted mt-1">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color, bg, note }) => (
          <Card key={label} className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted">{label}</p>
              <span className={`${bg} ${color} p-1.5 rounded-md`}>
                <Icon size={14} strokeWidth={2} />
              </span>
            </div>
            <p className="text-2xl font-semibold text-strong">{value}</p>
            <p className="text-[11px] text-muted">{note}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-[13px] font-medium text-strong mb-1">Getting started</p>
        <p className="text-[13px] text-muted">
          Start by adding employees, then track expenses and inventory. Live stats will appear here as data comes in.
        </p>
      </Card>
    </PageTransition>
  )
}
