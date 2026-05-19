'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Users, Receipt, Package, TrendingDown, Clock, Bell } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { fetchDashboardStats, fetchDashboardActivity, type ActivityItem } from '@/lib/dashboard'
import { formatMoney } from '@/lib/format'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { PageTransition } from '@/components/ui/page-transition'
import { Card } from '@/components/ui/card'
import { StatCardSkeleton } from '@/components/ui/skeleton'

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function activityLabel(action: string, resourceType: string, details: Record<string, unknown> | null): string {
  if (action === 'LOGIN')    return 'logged in'
  if (action === 'LOGOUT')   return 'logged out'
  if (action === 'REGISTER') return 'registered the company'
  const verb     = action === 'CREATE' ? 'created' : action === 'UPDATE' ? 'updated' : 'deactivated'
  const resource = resourceType.replace(/_/g, ' ')
  const name     = ((details?.name ?? details?.title ?? details?.email ?? '') as string).slice(0, 40)
  return name ? `${verb} ${resource} "${name}"` : `${verb} a ${resource}`
}

interface StatCardProps {
  label: string
  value: string
  note:  string
  icon:  React.ElementType
  color: string
  bg:    string
}

function StatCard({ label, value, note, icon: Icon, color, bg }: StatCardProps) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={`${bg} ${color} p-1.5 rounded-md`}>
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>
      <p className="text-2xl font-semibold text-strong">{value}</p>
      <p className="text-[11px] text-muted">{note}</p>
    </Card>
  )
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}

function EmployeeDashboard() {
  const { user } = useAuthStore()
  const { notifications, unreadCount } = useNotificationStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <PageTransition>
      <div className="mb-7">
        <h2 className="text-[22px] font-semibold text-strong">
          {greeting}, {user?.firstName}
        </h2>
        <p className="text-[13px] text-muted mt-1">
          Your personal workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/expenses">
          <Card className="p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted">My Expenses</p>
              <span className="bg-primary-soft text-primary p-1.5 rounded-md">
                <Receipt size={14} strokeWidth={2} />
              </span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              Submit and track your expense claims. View approval status.
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/attendance">
          <Card className="p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted">My Attendance</p>
              <span className="bg-success-soft text-success p-1.5 rounded-md">
                <Clock size={14} strokeWidth={2} />
              </span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              Check in, check out, and view your attendance history.
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/ai-assistant">
          <Card className="p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted">AI Assistant</p>
              <span className="bg-warning-soft text-warning p-1.5 rounded-md">
                <SparklesIcon size={14} strokeWidth={2} />
              </span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              Ask questions about your expenses, attendance, and more.
            </p>
          </Card>
        </Link>
      </div>

      {notifications.length > 0 ? (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={15} strokeWidth={1.8} className="text-muted" />
            <p className="text-[13px] font-semibold text-strong">Notifications</p>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 bg-danger text-white text-[11px] font-semibold rounded-full flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="py-2.5">
                <p className="text-[13px] font-medium text-strong">{n.title}</p>
                <p className="text-[12px] text-muted mt-0.5">{n.message}</p>
                <p className="text-[11px] text-muted/60 mt-1">{timeAgo(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-4">
            <Bell size={28} strokeWidth={1.5} className="text-muted mx-auto mb-3" />
            <p className="text-[13px] text-muted">No notifications yet.</p>
            <p className="text-[12px] text-muted/60 mt-1">You&apos;ll be notified when expenses are approved or rejected.</p>
          </div>
        </Card>
      )}
    </PageTransition>
  )
}

function SparklesIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.77a2 2 0 0 0 1.35 1.35L21 12l-5.77 1.88a2 2 0 0 0-1.35 1.35L12 21l-1.88-5.77a2 2 0 0 0-1.35-1.35L3 12l5.77-1.88a2 2 0 0 0 1.35-1.35z"/>
    </svg>
  )
}

function AdminDashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  fetchDashboardStats,
    staleTime: 55_000,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn:  fetchDashboardActivity,
    staleTime: 25_000,
  })

  const monthlyData = statsLoading
    ? []
    : (stats?.expenses.monthly ?? []).map((m) => ({
        label: MONTH_ABBR[Number(m.month.slice(5, 7)) - 1],
        total: m.total,
      }))

  const pieData = statsLoading
    ? []
    : (stats?.expenses.byCategory ?? []).map((c) => ({
        name:  c.name,
        value: c.total,
        color: c.color,
      }))

  const lowStock = stats?.inventory.lowStockCount ?? 0

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
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Active Employees"
              value={String(stats?.employees.active ?? 0)}
              note={`${stats?.employees.total ?? 0} total`}
              icon={Users}
              color="text-primary"
              bg="bg-primary-soft"
            />
            <StatCard
              label="Approved Expenses"
              value={formatMoney(stats?.expenses.approved.total ?? 0)}
              note={`${stats?.expenses.pending.count ?? 0} pending approval`}
              icon={Receipt}
              color="text-success"
              bg="bg-success-soft"
            />
            <StatCard
              label="Inventory Value"
              value={formatMoney(stats?.inventory.totalValue ?? 0)}
              note="Active products"
              icon={Package}
              color="text-primary"
              bg="bg-primary-soft"
            />
            <StatCard
              label="Low Stock Items"
              value={String(lowStock)}
              note="Below threshold"
              icon={TrendingDown}
              color={lowStock > 0 ? 'text-danger' : 'text-muted'}
              bg={lowStock > 0 ? 'bg-danger-soft' : 'bg-canvas'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-[13px] font-semibold text-strong mb-5">Monthly Expenses — Last 6 Months</p>
          {statsLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="h-3 w-48 animate-pulse bg-divider rounded" />
            </div>
          ) : monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0f766e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `₨${(v / 1000).toFixed(0)}k` : `₨${v}`}
                />
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value)), 'Total']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0f766e"
                  strokeWidth={2}
                  fill="url(#expGrad)"
                  dot={{ fill: '#0f766e', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[13px] text-muted">
              No expense data yet
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-[13px] font-semibold text-strong mb-5">Expenses by Category</p>
          {statsLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="h-3 w-48 animate-pulse bg-divider rounded" />
            </div>
          ) : pieData.length > 0 ? (
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
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatMoney(Number(value)), 'Amount']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[13px] text-muted">
              No approved expenses yet
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <p className="text-[13px] font-semibold text-strong mb-5">Attendance — Last 7 Days</p>
        {statsLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="h-3 w-48 animate-pulse bg-divider rounded" />
        </div>
      ) : (stats?.attendance ?? []).some((d) => d.present + d.absent + d.late > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.attendance} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="present" name="Present" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="late"    name="Late"    fill="#d97706" radius={[3, 3, 0, 0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[13px] text-muted">
            No attendance records for the last 7 days
          </div>
        )}
      </Card>

      <Card className="p-6">
        <p className="text-[13px] font-semibold text-strong mb-4">Recent Activity</p>
        {activityLoading && <p className="text-[13px] text-muted">Loading...</p>}
        {!activityLoading && (activity ?? []).length === 0 && (
          <p className="text-[13px] text-muted">No activity yet.</p>
        )}
        <ul className="divide-y divide-border">
          {(activity ?? []).map((item: ActivityItem) => (
            <li key={item.id} className="py-3 flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                {item.user.firstName[0]}{item.user.lastName[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-strong">
                  <span className="font-medium">{item.user.firstName} {item.user.lastName}</span>
                  {' '}{activityLabel(item.action, item.resourceType, item.details)}
                </p>
              </div>
              <span className="text-[11px] text-muted shrink-0 mt-0.5">{timeAgo(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </PageTransition>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'EMPLOYEE') {
    return <EmployeeDashboard />
  }

  return <AdminDashboard />
}
