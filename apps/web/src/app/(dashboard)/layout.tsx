'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Package,
  Sparkles,
  LogOut,
  ChevronRight,
  Layers,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Sparkles },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    try {
      await api.post('/api/v1/auth/logout')
    } finally {
      logout()
      router.push('/login')
    }
  }

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
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
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
          <span className="text-[11px] bg-primary-soft text-primary px-2 py-0.5 rounded-full font-medium">
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
