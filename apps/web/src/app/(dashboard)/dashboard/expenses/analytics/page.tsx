'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { fetchMonthlyAnalytics } from '@/lib/expenses'
import { formatMoney } from '@/lib/format'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

// Design-token colors for each status — matched to the badge/token system
const STATUS_COLORS: Record<string, string> = {
  PENDING:  '#d97706', // --color-warning
  APPROVED: '#16a34a', // --color-success
  REJECTED: '#dc2626', // --color-danger
}

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1 // getMonth() is 0-indexed

export default function ExpenseAnalyticsPage() {
  const [year,  setYear]  = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expense-analytics', year, month],
    queryFn: () => fetchMonthlyAnalytics(year, month),
  })

  // Derive summary stats from byStatus
  const totalAmount    = data?.byStatus.reduce((sum, s) => sum + Number(s.total), 0) ?? 0
  const approvedAmount = Number(data?.byStatus.find((s) => s.status === 'APPROVED')?.total ?? 0)
  const pendingCount   = data?.byStatus.find((s) => s.status === 'PENDING')?.count ?? 0

  // BarChart data: one bar per status
  const barData = (data?.byStatus ?? []).map((s) => ({
    name: s.status,
    amount: Number(s.total),
    count: s.count,
  }))

  // PieChart data: one slice per category (only categories with spend > 0)
  const pieData = (data?.byCategory ?? [])
    .filter((c) => Number(c.total) > 0)
    .map((c) => ({
      name:  c.name,
      value: Number(c.total),
      color: c.color,
    }))

  return (
    <PageTransition>
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[13px]">
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-1.5 text-muted hover:text-strong transition-colors"
          >
            <ArrowLeft size={13} />
            Expenses
          </Link>
          <span className="text-border">/</span>
          <span className="text-strong font-medium">Analytics</span>
        </div>

        {/* Header + month/year selectors in the same row */}
        <div className="flex items-start justify-between mb-6">
          <PageHeader
            title="Expense Analytics"
            subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
          />
          <div className="flex items-center gap-2 mt-1">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface text-strong"
            >
              {[currentYear, currentYear - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-[13px] text-muted">Loading analytics...</div>
        )}
        {isError && (
          <div className="p-12 text-center text-[13px] text-danger">Failed to load analytics.</div>
        )}

        {data && (
          <>
            {/* Stat summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Total Submitted
                </p>
                <p className="text-[22px] font-semibold text-strong">{formatMoney(totalAmount)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Total Approved
                </p>
                <p className="text-[22px] font-semibold text-success">{formatMoney(approvedAmount)}</p>
              </Card>
              <Card className="p-5">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Pending Review
                </p>
                <p className="text-[22px] font-semibold text-warning">{pendingCount}</p>
                <p className="text-[12px] text-muted mt-0.5">
                  expense{pendingCount !== 1 ? 's' : ''}
                </p>
              </Card>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Bar chart — spend by approval status */}
              <Card className="p-6">
                <p className="text-[13px] font-semibold text-strong mb-5">By Status</p>
                {barData.some((d) => d.amount > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `₨${(v / 1000).toFixed(0)}k` : `₨${v}`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [formatMoney(Number(value)), 'Amount']}
                        contentStyle={{
                          fontSize: 12,
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      />
                      {/* Cell gives each bar a different color based on its status */}
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#0f766e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-[13px] text-muted">
                    No expenses this month
                  </div>
                )}
              </Card>

              {/* Donut chart — spend by category */}
              <Card className="p-6">
                <p className="text-[13px] font-semibold text-strong mb-5">By Category</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {/* Cell maps each slice to the category's own color from the DB */}
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatMoney(Number(value)), 'Amount']}
                        contentStyle={{
                          fontSize: 12,
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, color: '#64748b' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-[13px] text-muted">
                    No category data this month
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
