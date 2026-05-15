'use client'

import { useAuthStore } from '@/store/auth.store'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Good morning, {user?.firstName}
        </h2>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: '—' },
          { label: 'Pending Expenses', value: '—' },
          { label: 'Low Stock Items', value: '—' },
          { label: 'Open AI Chats', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
