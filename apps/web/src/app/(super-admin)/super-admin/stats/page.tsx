'use client'

import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Briefcase, FileText, CheckCircle } from 'lucide-react'
import { fetchPlatformStats, PlatformStats } from '@/lib/super-admin'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  description?: string
  accent?: string
}

function StatCard({ label, value, icon: Icon, description, accent = 'bg-primary/10 text-primary' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-2xl font-bold text-strong tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm font-medium text-strong mt-0.5">{label}</p>
      {description && <p className="text-xs text-muted mt-1">{description}</p>}
    </div>
  )
}

export default function StatsPage() {
  const { data, isLoading } = useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: fetchPlatformStats,
    refetchInterval: 30_000,
  })

  const activePct =
    data && data.totalCompanies > 0
      ? Math.round((data.activeCompanies / data.totalCompanies) * 100)
      : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-strong">Platform Stats</h1>
        <p className="text-sm text-muted mt-0.5">Live snapshot — refreshes every 30 seconds</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-canvas mb-4" />
              <div className="h-7 w-20 bg-canvas rounded mb-1" />
              <div className="h-4 w-28 bg-canvas rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Companies"
            value={data?.totalCompanies ?? 0}
            icon={Building2}
            description="All registered tenants"
            accent="bg-primary/10 text-primary"
          />
          <StatCard
            label="Active Companies"
            value={data?.activeCompanies ?? 0}
            icon={CheckCircle}
            description={`${activePct}% of total`}
            accent="bg-green-50 text-green-600"
          />
          <StatCard
            label="Total Users"
            value={data?.totalUsers ?? 0}
            icon={Users}
            description="Across all tenants"
            accent="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Total Employees"
            value={data?.totalEmployees ?? 0}
            icon={Briefcase}
            description="Managed workforce records"
            accent="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Total Expenses"
            value={data?.totalExpenses ?? 0}
            icon={FileText}
            description="Submitted expense claims"
            accent="bg-amber-50 text-amber-600"
          />
        </div>
      )}
    </div>
  )
}
