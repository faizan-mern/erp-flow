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
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: Sparkles },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      logout()
      router.push('/login')
    }
  }

  const pageLabel = pathname === '/dashboard'
    ? 'Dashboard'
    : NAV_LINKS.find((l) => pathname.startsWith(l.href) && l.href !== '/dashboard')?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen bg-[#f8fafc]">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#e2e8f0] flex flex-col shrink-0">

        {/* Brand */}
        <div className="px-4 h-14 flex items-center border-b border-[#e2e8f0]">
          <span className="text-[15px] font-semibold text-[#0f172a] tracking-tight">
            ERP Platform
          </span>
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-[#64748b] hover:bg-slate-50 hover:text-[#0f172a]'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-[#e2e8f0]">
          {user && (
            <div className="mb-2 px-1">
              <p className="text-[13px] font-medium text-[#0f172a] truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-[#64748b] capitalize mt-0.5">
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[12px] text-[#64748b] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[13px] text-[#64748b]">
            <span>ERP</span>
            <ChevronRight size={13} />
            <span className="text-[#0f172a] font-medium">{pageLabel}</span>
          </div>
          <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
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
