'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import api from '@/lib/api'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Clock,
  Receipt,
  Package,
  Sparkles,
  LogOut,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { ToastContainer } from '@/components/ui/toast'
import { NotificationBell } from '@/components/ui/notification-bell'
import { useSocket } from '@/hooks/use-socket'

type NavLink = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  // Hide for callers whose role isn't COMPANY_ADMIN
  adminOnly?: boolean
  // Hide for callers whose role is EMPLOYEE
  hideForEmployee?: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard },
  // Employee directory is admin/manager-only — regular employees shouldn't browse colleagues' records.
  { href: '/dashboard/employees',    label: 'Employees',    icon: Users, hideForEmployee: true },
  { href: '/dashboard/team',         label: 'Team',         icon: UserCog, adminOnly: true },
  { href: '/dashboard/attendance',   label: 'Attendance',   icon: Clock },
  { href: '/dashboard/expenses',     label: 'Expenses',     icon: Receipt },
  { href: '/dashboard/inventory',    label: 'Inventory',    icon: Package },
  { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Sparkles },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const resetNotifications = useNotificationStore((s) => s.reset)
  useSocket()

  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  async function handleLogout() {
    try {
      await api.post('/api/v1/auth/logout')
    } finally {
      queryClient.clear()
      resetNotifications()
      logout()
      router.push('/login')
    }
  }

  const visibleLinks = NAV_LINKS.filter((l) => {
    if (l.adminOnly && user?.role !== 'COMPANY_ADMIN') return false
    if (l.hideForEmployee && user?.role === 'EMPLOYEE') return false
    return true
  })

  const pageLabel = pathname === '/dashboard'
    ? 'Dashboard'
    : NAV_LINKS.find((l) => pathname.startsWith(l.href) && l.href !== '/dashboard')?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen bg-canvas">

      {/* Sidebar */}
      <aside className="w-60 bg-sidebar flex flex-col shrink-0">

        {/* Brand */}
        <div className="px-5 h-14 flex items-center gap-2.5 border-b border-white/6">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center shrink-0">
            <Layers size={12} className="text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white tracking-tight truncate">
              {user?.companyName ?? 'ERPFlow'}
            </p>
            {user?.companySlug && (
              // Showing the slug here so users can recover it for re-login if
              // they ever forget it — the login page requires companySlug.
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {user.companySlug}
              </p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-white/6">
          {user && (
            <div className="mb-2 px-1">
              <p className="text-[13px] font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <span>ERPFlow</span>
            <ChevronRight size={13} />
            <span className="text-strong font-medium">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="text-[11px] bg-primary-soft text-primary px-2 py-0.5 rounded-full font-medium">
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
